import {
  ActionRowBuilder,
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

async function ensureBotPermissions(guild, channel) {
  const botMember = guild.members.me ?? await guild.members.fetchMe();
  const permissions = channel.permissionsFor(botMember);
  const needed = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.CreateInstantInvite
  ];
  const missing = needed.filter((permission) => !permissions?.has(permission));

  if (missing.length > 0) {
    throw new Error(`I need View Channel, Send Messages, Embed Links, and Create Instant Invite in ${channel}.`);
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
      content: "Send your ready message in this channel within 2 minutes. Include the Roblox link and I will turn it into buttons.",
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
        embeds: [
          createEmbed({
            title: "Zenoria Ready",
            description: readyText,
            fields: [{ name: "Posted By", value: `${interaction.user}`, inline: true }]
          })
        ],
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
          { name: "Discord Invite", value: "Created as permanent with no expiry and unlimited uses." }
        ])
      ]
    });
  }
};
