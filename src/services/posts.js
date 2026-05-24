import { AttachmentBuilder, ChannelType, PermissionFlagsBits } from "discord.js";
import { roleGroups } from "../data/serverTemplate.js";
import { getGuildState } from "../data/store.js";
import { createEmbed, successEmbed } from "../utils/embeds.js";
import { sendLog } from "./logger.js";

const postableChannelTypes = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement
]);

const updateRoleNames = roleGroups.ownership;
const sneakRoleNames = [...new Set([
  ...roleGroups.seniorStaff,
  ...roleGroups.development
])];

const contentTypeExtensionOverrides = new Map([
  ["application/gzip", "gz"],
  ["application/javascript", "js"],
  ["application/json", "json"],
  ["application/pdf", "pdf"],
  ["application/vnd.rar", "rar"],
  ["application/x-7z-compressed", "7z"],
  ["application/x-tar", "tar"],
  ["application/zip", "zip"],
  ["audio/mpeg", "mp3"],
  ["audio/ogg", "ogg"],
  ["audio/wav", "wav"],
  ["image/jpeg", "jpg"],
  ["text/css", "css"],
  ["text/csv", "csv"],
  ["text/html", "html"],
  ["text/plain", "txt"],
  ["video/quicktime", "mov"]
]);

function normalizeLookupName(name) {
  return String(name)
    .toLowerCase()
    .replace(/^[^a-z0-9]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function hasAnyRole(member, roleNames) {
  return member.roles.cache.some((role) => roleNames.includes(role.name));
}

function formatRoleList(roleNames) {
  if (roleNames.length <= 2) return roleNames.join(" or ");

  return `${roleNames.slice(0, -1).join(", ")}, or ${roleNames.at(-1)}`;
}

function requirePostAccess(member, roleNames, commandLabel) {
  if (member.id === member.guild.ownerId) return;
  if (hasAnyRole(member, roleNames)) return;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return;

  throw new Error(`Only ${formatRoleList(roleNames)} can use /${commandLabel}.`);
}

function validatePostChannel(channel) {
  if (!channel || !postableChannelTypes.has(channel.type) || typeof channel.send !== "function") {
    throw new Error("I can only post this in a text or announcement channel.");
  }

  return channel;
}

async function ensureBotCanPost(guild, channel, permissions, action) {
  const botMember = guild.members.me ?? await guild.members.fetchMe();
  const channelPermissions = channel.permissionsFor(botMember);
  const missing = permissions.filter((permission) => !channelPermissions?.has(permission));

  if (missing.length > 0) {
    throw new Error(`I do not have enough permissions to ${action} in ${channel}.`);
  }
}

async function findDefaultChannel(guild, key, aliases) {
  await guild.channels.fetch();

  const state = await getGuildState(guild.id).catch(() => null);
  const storedIds = [key, ...aliases]
    .map((candidate) => state?.channels?.[candidate])
    .filter(Boolean);

  for (const id of storedIds) {
    const channel = guild.channels.cache.get(id) ?? await guild.channels.fetch(id).catch(() => null);
    if (channel && postableChannelTypes.has(channel.type)) return channel;
  }

  const normalizedNames = new Set([key, ...aliases].map(normalizeLookupName));

  return guild.channels.cache.find((channel) =>
    postableChannelTypes.has(channel.type) &&
    normalizedNames.has(normalizeLookupName(channel.name))
  );
}

async function resolveTargetChannel(interaction, selectedChannel, key, aliases) {
  if (selectedChannel) return validatePostChannel(selectedChannel);

  const defaultChannel = await findDefaultChannel(interaction.guild, key, aliases);
  return validatePostChannel(defaultChannel ?? interaction.channel);
}

function extensionFromContentType(contentType) {
  const normalizedContentType = contentType?.split(";").at(0)?.trim().toLowerCase();
  if (!normalizedContentType) return "bin";
  if (contentTypeExtensionOverrides.has(normalizedContentType)) {
    return contentTypeExtensionOverrides.get(normalizedContentType);
  }

  const subtype = normalizedContentType.split("/").at(1);
  const cleanedSubtype = subtype
    ?.split("+")
    .at(0)
    ?.replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleanedSubtype || "bin";
}

function sanitizeAttachmentName(name, contentType) {
  const fallback = `sneak-peek.${extensionFromContentType(contentType)}`;
  const withoutSpoilerPrefix = String(name || fallback).replace(/^SPOILER_/i, "");
  const cleaned = withoutSpoilerPrefix
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
}

function createMessageLinkField(message) {
  return [{ name: "Message", value: `[Open message](${message.url})` }];
}

export async function postUpdate(interaction, { update, title, channel }) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  requirePostAccess(member, updateRoleNames, "post_update");

  const targetChannel = await resolveTargetChannel(interaction, channel, "updates", ["updates"]);
  await ensureBotCanPost(
    interaction.guild,
    targetChannel,
    [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
    "post updates"
  );

  const message = await targetChannel.send({
    content: "New Zenoria update:",
    embeds: [
      createEmbed({
        title: title || "Zenoria Update",
        description: update,
        fields: [{ name: "Posted By", value: `${interaction.user}`, inline: true }]
      })
    ]
  });

  await sendLog(interaction.guild, {
    title: "Update Posted",
    description: `${interaction.user.tag} posted an update in ${targetChannel}.`,
    fields: [{ name: "Message", value: message.url }],
    color: 0x2ecc71
  }).catch(() => null);

  return {
    message,
    embed: successEmbed("Posted Update", `Sent the update in ${targetChannel}.`, createMessageLinkField(message))
  };
}

export async function postSneak(interaction, { file, image, caption, title, channel }) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  requirePostAccess(member, sneakRoleNames, "post_sneak");

  const attachment = file ?? image;

  if (!attachment) {
    throw new Error("Attach a file for the sneak peek.");
  }

  const targetChannel = await resolveTargetChannel(interaction, channel, "sneak-peeks", ["sneak-peeks"]);
  await ensureBotCanPost(
    interaction.guild,
    targetChannel,
    [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles
    ],
    "post sneak peeks"
  );

  const spoilerFile = new AttachmentBuilder(attachment.url, {
    name: sanitizeAttachmentName(attachment.name, attachment.contentType),
    description: "Zenoria sneak peek file"
  }).setSpoiler(true);

  const message = await targetChannel.send({
    content: "New Zenoria sneak peek:",
    embeds: [
      createEmbed({
        title: title || "Zenoria Sneak Peek",
        description: caption || "A new sneak peek has been posted.",
        fields: [{ name: "Posted By", value: `${interaction.user}`, inline: true }]
      })
    ],
    files: [spoilerFile]
  });

  await sendLog(interaction.guild, {
    title: "Sneak Peek Posted",
    description: `${interaction.user.tag} posted a sneak peek in ${targetChannel}.`,
    fields: [{ name: "Message", value: message.url }],
    color: 0x5865f2
  }).catch(() => null);

  return {
    message,
    embed: successEmbed("Posted Sneak Peek", `Sent the spoiler file in ${targetChannel}.`, createMessageLinkField(message))
  };
}
