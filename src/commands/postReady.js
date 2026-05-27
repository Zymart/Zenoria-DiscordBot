import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import { config } from "../config.js";
import { createEmbed, errorEmbed, successEmbed } from "../utils/embeds.js";

const postableChannelTypes = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement
]);
const ROBLOX_GROUP_URL = "https://www.roblox.com/groups/437848777";
const maxPhotoAttachments = 10;
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

function attachmentExtension(attachment) {
  const contentTypeExtension = attachment.contentType?.split(";").at(0)?.split("/").at(1)?.toLowerCase();
  const nameExtension = attachment.name?.split(".").at(-1)?.toLowerCase();
  const extension = imageExtensions.has(contentTypeExtension) ? contentTypeExtension : nameExtension;

  return imageExtensions.has(extension) ? extension : "png";
}

function isImageAttachment(attachment) {
  const contentType = attachment.contentType?.toLowerCase();
  const nameExtension = attachment.name?.split(".").at(-1)?.toLowerCase();

  return contentType?.startsWith("image/") || imageExtensions.has(nameExtension);
}

function createPhotoFiles(message) {
  return [...message.attachments.values()]
    .filter(isImageAttachment)
    .slice(0, maxPhotoAttachments)
    .map((attachment, index) => {
      const name = `ready-photo-${index + 1}.${attachmentExtension(attachment)}`;

      return {
        name,
        file: new AttachmentBuilder(attachment.url, {
          name,
          description: "Ready post photo"
        })
      };
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

function createReadyEmbeds(readyText, user, photoFiles) {
  const embeds = [
    createEmbed({
      title: "Zenoria Ready",
      description: readyText,
      fields: [{ name: "Posted By", value: `${user}`, inline: true }]
    })
  ];

  if (photoFiles.length > 0) {
    embeds[0].setImage(`attachment://${photoFiles[0].name}`);
  }

  for (const photo of photoFiles.slice(1)) {
    embeds.push(
      new EmbedBuilder()
        .setColor(config.embedColor)
        .setImage(`attachment://${photo.name}`)
    );
  }

  return embeds;
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

    const photoFiles = createPhotoFiles(sourceMessage);

    if (photoFiles.length > 0) {
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

      message = await targetChannel.send({
        content: "Zenoria is ready:",
        embeds: createReadyEmbeds(readyText, interaction.user, photoFiles),
        files: photoFiles.map((photo) => photo.file),
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
          { name: "Photos", value: photoFiles.length > 0 ? `Added ${photoFiles.length} photo(s).` : "No photos attached." },
          { name: "Discord Invite", value: "Created as permanent with no expiry and unlimited uses." }
        ])
      ]
    });
  }
};
