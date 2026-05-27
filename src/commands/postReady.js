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
import { createEmbed, errorEmbed, successEmbed } from "../utils/embeds.js";

const postableChannelTypes = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement
]);
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

function cleanUrlCandidate(value) {
  return value.replace(/[),.>\]}]+$/g, "");
}

function findRobloxUrl(content) {
  const matches = content.match(/https?:\/\/[^\s<]+/gi) ?? [];

  for (const match of matches) {
    const candidate = cleanUrlCandidate(match);

    try {
      const url = new URL(candidate);
      const hostname = url.hostname.toLowerCase();

      if (hostname === "roblox.com" || hostname.endsWith(".roblox.com")) {
        return url.toString();
      }
    } catch {
      // Keep scanning if one URL-like value is malformed.
    }
  }

  return null;
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
    const permissionList = withPhotos
      ? "View Channel, Send Messages, Embed Links, Create Instant Invite, and Attach Files"
      : "View Channel, Send Messages, Embed Links, and Create Instant Invite";

    throw new Error(`I need ${permissionList} in ${channel}.`);
  }
}

async function editWithError(interaction, message) {
  await interaction.editReply({
    content: "",
    embeds: [errorEmbed("Post Ready Failed", message)]
  });
}

function createButtonRow(robloxUrl, inviteUrl) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Roblox")
      .setURL(robloxUrl),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Discord Invite")
      .setURL(inviteUrl)
  );
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

    await interaction.reply({
      content: "Send your ready message in this channel within 2 minutes. Include the Roblox link, and you can attach up to 10 photos.",
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

    const robloxUrl = findRobloxUrl(readyText);

    if (!robloxUrl) {
      await editWithError(interaction, "I could not find a roblox.com link in your message. Run /post_ready again and include the Roblox link.");
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

      const embed = createEmbed({
        title: "Zenoria Ready",
        description: readyText,
        fields: [{ name: "Posted By", value: `${interaction.user}`, inline: true }]
      });

      if (photoFiles.length > 0) {
        embed.setImage(`attachment://${photoFiles[0].name}`);
      }

      message = await targetChannel.send({
        content: "Zenoria is ready:",
        embeds: [embed],
        files: photoFiles.map((photo) => photo.file),
        components: [createButtonRow(robloxUrl, invite.url)]
      });
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
