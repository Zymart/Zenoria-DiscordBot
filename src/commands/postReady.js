import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import sharp from "sharp";
import { createEmbed, errorEmbed, successEmbed } from "../utils/embeds.js";

const postableChannelTypes = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement
]);
const ROBLOX_GROUP_URL = "https://www.roblox.com/groups/437848777";
const maxPhotoAttachments = 10;
const collageFileName = "ready-photos.jpg";
const imageExtensions = new Set(["gif", "jpeg", "jpg", "png", "webp"]);

function validatePostChannel(channel) {
  if (!channel || !postableChannelTypes.has(channel.type) || typeof channel.send !== "function") {
    throw new Error("I can only post ready messages in a text or announcement channel.");
  }

  if (typeof channel.createInvite !== "function") {
    throw new Error("I cannot create a Discord invite for that channel.");
  }

  return channel;
}

function isImageAttachment(attachment) {
  const contentType = attachment.contentType?.toLowerCase();
  const nameExtension = attachment.name?.split(".").at(-1)?.toLowerCase();

  return contentType?.startsWith("image/") || imageExtensions.has(nameExtension);
}

function createPhotoSources(message) {
  return [...message.attachments.values()]
    .filter(isImageAttachment)
    .slice(0, maxPhotoAttachments)
    .map((attachment) => attachment.url);
}

function collageColumns(photoCount) {
  if (photoCount <= 1) return 1;
  if (photoCount <= 4) return 2;
  if (photoCount <= 9) return 3;
  return 4;
}

async function fetchImageBuffer(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("I could not download one of the attached photos.");
  }

  return Buffer.from(await response.arrayBuffer());
}

async function createPhotoCollage(photoUrls) {
  if (photoUrls.length === 0) return null;

  const tileSize = photoUrls.length === 1 ? 1024 : 560;
  const gap = photoUrls.length === 1 ? 0 : 16;
  const columns = collageColumns(photoUrls.length);
  const rows = Math.ceil(photoUrls.length / columns);
  const width = columns * tileSize + Math.max(0, columns - 1) * gap;
  const height = rows * tileSize + Math.max(0, rows - 1) * gap;

  const tiles = await Promise.all(
    photoUrls.map(async (url, index) => {
      const input = await fetchImageBuffer(url);
      const buffer = await sharp(input, { animated: false })
        .rotate()
        .resize(tileSize, tileSize, { fit: "cover" })
        .jpeg({ quality: 90 })
        .toBuffer();

      return {
        input: buffer,
        left: (index % columns) * (tileSize + gap),
        top: Math.floor(index / columns) * (tileSize + gap)
      };
    })
  );

  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#111827"
    }
  })
    .composite(tiles)
    .jpeg({ quality: 88 })
    .toBuffer();

  return new AttachmentBuilder(buffer, {
    name: collageFileName,
    description: "Ready post photo collage"
  });
}

async function ensureBotPermissions(guild, channel, { withPhotos = false } = {}) {
  const botMember = guild.members.me ?? await guild.members.fetchMe();
  const permissions = channel.permissionsFor(botMember);
  const needed = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.CreateInstantInvite
  ];

  if (withPhotos) {
    needed.push(PermissionFlagsBits.AttachFiles);
  }

  const missing = needed.filter((permission) => !permissions?.has(permission));

  if (missing.length > 0) {
    const permissionNames = ["View Channel", "Send Messages", "Embed Links", "Create Instant Invite"];

    if (withPhotos) {
      permissionNames.push("Attach Files");
    }

    throw new Error(`I need ${permissionNames.join(", ")} in ${channel}.`);
  }
}

async function ensureBotCanDeleteMessages(guild, channel) {
  const botMember = guild.members.me ?? await guild.members.fetchMe();
  const permissions = channel.permissionsFor(botMember);

  if (!permissions?.has(PermissionFlagsBits.ManageMessages)) {
    throw new Error(`I need Manage Messages in ${channel} so I can delete the original post message after copying it.`);
  }
}

async function editWithError(interaction, message) {
  await interaction.editReply({
    content: "",
    embeds: [errorEmbed("Post Ready Failed", message)]
  });
}

async function resolveButtonEmoji(guild, patterns, fallback) {
  const emojis = await guild.emojis.fetch().catch(() => guild.emojis.cache);
  const emoji = emojis.find((candidate) =>
    patterns.some((pattern) => pattern.test(candidate.name))
  );

  return emoji
    ? { id: emoji.id, name: emoji.name, animated: emoji.animated }
    : { name: fallback };
}

async function createButtonRow(guild, inviteUrl) {
  const robloxEmoji = await resolveButtonEmoji(guild, [/roblox/i, /\brbx\b/i, /blox/i], "\u{1F3AE}");
  const discordEmoji = await resolveButtonEmoji(guild, [/discord/i, /server/i, /invite/i], "\u{1F4AC}");

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Join our Roblox Group")
      .setEmoji(robloxEmoji)
      .setURL(ROBLOX_GROUP_URL),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Join our Discord Server")
      .setEmoji(discordEmoji)
      .setURL(inviteUrl)
  );
}

function createReadyEmbed(readyText, user, collageFile) {
  const embed = createEmbed({
    title: "Zenoria Ready",
    description: readyText,
    fields: [{ name: "Posted By", value: `${user}`, inline: true }]
  });

  if (collageFile) {
    embed.setImage(`attachment://${collageFileName}`);
  }

  return embed;
}

export default {
  data: new SlashCommandBuilder()
    .setName("post_ready")
    .setDescription("Turn your next message into a ready embed with Roblox and Discord buttons.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Where to post it. Defaults to this channel.")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),
  async execute(interaction) {
    const targetChannel = validatePostChannel(interaction.options.getChannel("channel") ?? interaction.channel);
    await ensureBotPermissions(interaction.guild, targetChannel);
    await ensureBotCanDeleteMessages(interaction.guild, interaction.channel);

    await interaction.reply({
      content: "Send your ready message in this channel within 2 minutes. You can attach up to 10 photos.",
      flags: MessageFlags.Ephemeral
    });

    const collected = await interaction.channel.awaitMessages({
      filter: (message) => message.author.id === interaction.user.id && !message.author.bot,
      max: 1,
      time: 120_000,
      errors: ["time"]
    }).catch(() => null);

    const sourceMessage = collected?.first();

    if (!sourceMessage) {
      await editWithError(interaction, "I did not receive your ready message in time. Run /post_ready again when you are ready.");
      return;
    }

    const readyText = sourceMessage.content.trim();

    if (!readyText) {
      await editWithError(interaction, "I could not read that message. Make sure Message Content Intent is enabled for the bot.");
      return;
    }

    const photoUrls = createPhotoSources(sourceMessage);

    if (photoUrls.length > 0) {
      await ensureBotPermissions(interaction.guild, targetChannel, { withPhotos: true });
    }

    let message;

    try {
      const invite = await targetChannel.createInvite({
        maxAge: 0,
        maxUses: 0,
        temporary: false,
        unique: true,
        reason: `Permanent invite created by /post_ready for ${interaction.user.tag}`
      });
      const collageFile = await createPhotoCollage(photoUrls);

      message = await targetChannel.send({
        embeds: [createReadyEmbed(readyText, interaction.user, collageFile)],
        files: collageFile ? [collageFile] : [],
        components: [await createButtonRow(interaction.guild, invite.url)]
      });

      await sourceMessage.delete();
    } catch (error) {
      await editWithError(interaction, error.message || "I could not create the ready post.");
      return;
    }

    await interaction.editReply({
      content: "",
      embeds: [
        successEmbed("Posted Ready Message", `Sent the ready embed in ${targetChannel}.`, [
          { name: "Message", value: `[Open message](${message.url})` },
          { name: "Photos", value: photoUrls.length > 0 ? `Combined ${photoUrls.length} photo(s) into one embed image.` : "No photos attached." },
          { name: "Discord Invite", value: "Created as permanent with no expiry and unlimited uses." }
        ])
      ]
    });
  }
};
