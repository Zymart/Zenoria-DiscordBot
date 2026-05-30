import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} from "discord.js";
import { config } from "../config.js";
import { getGuildState, updateGuildState } from "../data/store.js";
import { roleGroups } from "../data/serverTemplate.js";
import { infoEmbed, successEmbed } from "../utils/embeds.js";
import { sendLog } from "./logger.js";

const ticketTextAllows = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks
];

function sanitizeChannelPart(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 18) || "member";
}

function getRolesByName(guild, names) {
  return names
    .map((name) => guild.roles.cache.find((role) => role.name === name))
    .filter(Boolean);
}

function createTicketOverwrites(guild, member) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: member.id,
      allow: ticketTextAllows
    }
  ];

  for (const role of getRolesByName(guild, roleGroups.support)) {
    overwrites.push({
      id: role.id,
      allow: [
        ...ticketTextAllows,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ManageChannels
      ]
    });
  }

  for (const role of getRolesByName(guild, roleGroups.bots)) {
    overwrites.push({
      id: role.id,
      allow: [
        ...ticketTextAllows,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ManageChannels
      ]
    });
  }

  return overwrites;
}

async function findOrCreateTicketCategory(guild) {
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name === config.setup.ticketCategoryName
  );

  if (existing) return existing;

  return guild.channels.create({
    name: config.setup.ticketCategoryName,
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      }
    ],
    reason: "Zenoria ticket category setup"
  });
}

export function createTicketPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:create")
      .setLabel("Open Ticket")
      .setStyle(ButtonStyle.Primary)
  );
}

export function createApplicationTicketPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:create")
      .setLabel("Apply Now")
      .setStyle(ButtonStyle.Success)
  );
}

function createTicketResolutionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:resolution:accept")
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ticket:resolution:reject")
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
  );
}

function ticketResolutionEnabled(ticket) {
  return ticket.resolutionEnabled !== false;
}

export function createCloseTicketRow(ticket = {}) {
  const row = new ActionRowBuilder();

  if (ticketResolutionEnabled(ticket)) {
    if (ticket.handledBy) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId("ticket:done")
          .setLabel(ticket.resolutionMessageId ? "Waiting For Member" : "Done")
          .setStyle(ButtonStyle.Success)
          .setDisabled(Boolean(ticket.resolutionMessageId))
      );
    } else {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId("ticket:handle")
          .setLabel("Handle Ticket")
          .setStyle(ButtonStyle.Primary)
      );
    }
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:close")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  return row;
}

function inferOwnerIdFromTopic(channel) {
  const topicMatch = channel.topic?.match(/\((\d{17,20})\)/);
  return topicMatch?.[1] ?? null;
}

function findTicketOwnerEntry(state, channel) {
  return Object.entries(state.tickets.openByUser).find(([, channelId]) => channelId === channel.id);
}

function defaultResolutionEnabled(channel) {
  return !channel.name.includes("apply-") && !channel.topic?.startsWith("Application Ticket");
}

function normalizeTicketMeta(channel, ownerId, meta = {}) {
  return {
    channelId: channel.id,
    ownerId,
    title: meta.title ?? "Support Ticket",
    intro: meta.intro ?? "A staff member will help you here. Use the button below when this ticket is finished.",
    reason: meta.reason ?? "No reason provided",
    messageId: meta.messageId ?? null,
    handledBy: meta.handledBy ?? null,
    resolutionMessageId: meta.resolutionMessageId ?? null,
    resolutionEnabled: meta.resolutionEnabled ?? defaultResolutionEnabled(channel),
    createdAt: meta.createdAt ?? null
  };
}

async function getTicketInfo(guild, channel) {
  const state = await getGuildState(guild.id);
  const ownerEntry = findTicketOwnerEntry(state, channel);
  const storedMeta = state.tickets.metaByChannel[channel.id] ?? {};
  const ownerId = storedMeta.ownerId ?? ownerEntry?.[0] ?? inferOwnerIdFromTopic(channel);
  const isTicketChannel =
    Boolean(ownerEntry) ||
    Boolean(storedMeta.channelId) ||
    channel.name.includes("ticket-") ||
    channel.name.includes("apply-");

  return {
    state,
    ownerEntry,
    ownerId,
    isTicketChannel,
    meta: normalizeTicketMeta(channel, ownerId, storedMeta)
  };
}

function createTicketEmbed(ticket) {
  const fields = [
    { name: "Opened By", value: ticket.ownerId ? `<@${ticket.ownerId}>` : "Unknown", inline: true }
  ];

  if (ticketResolutionEnabled(ticket)) {
    fields.push({
      name: "Handled By",
      value: ticket.handledBy ? `<@${ticket.handledBy}>` : "Not claimed",
      inline: true
    });
  }

  if (ticket.resolutionMessageId) {
    fields.push({ name: "Status", value: "Waiting for member confirmation", inline: true });
  }

  fields.push({ name: "Reason", value: ticket.reason.slice(0, 1024), inline: false });

  return infoEmbed(ticket.title, ticket.intro, fields);
}

async function refreshTicketMessage(channel, ticket) {
  if (!ticket.messageId) return false;

  const message = await channel.messages.fetch(ticket.messageId).catch(() => null);
  if (!message) return false;

  await message.edit({
    embeds: [createTicketEmbed(ticket)],
    components: [createCloseTicketRow(ticket)]
  }).catch(() => null);

  return true;
}

function memberCanHandleTicket(member) {
  return (
    member.id === member.guild.ownerId ||
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    memberHasSupportRole(member)
  );
}

export async function createTicket(
  guild,
  member,
  reason = "No reason provided",
  {
    title = "Support Ticket",
    intro = "A staff member will help you here. Use the button below when this ticket is finished.",
    channelPrefix = "ticket",
    mentionRoleNames = [],
    resolutionEnabled = true
  } = {}
) {
  const state = await getGuildState(guild.id);
  const existingTicketId = state.tickets.openByUser[member.id];
  const existingTicket =
    existingTicketId &&
    (guild.channels.cache.get(existingTicketId) ??
      await guild.channels.fetch(existingTicketId).catch(() => null));

  if (existingTicket) {
    return {
      channel: existingTicket,
      alreadyOpen: true,
      embed: infoEmbed("Ticket Already Open", `You already have an open ticket: ${existingTicket}`)
    };
  }

  const ticketNumber = await updateGuildState(guild.id, (guildState) => {
    guildState.tickets.counter += 1;
    return guildState.tickets.counter;
  });

  const category = await findOrCreateTicketCategory(guild);
  const channelName = `🎫・${channelPrefix}-${String(ticketNumber).padStart(4, "0")}-${sanitizeChannelPart(member.user.username)}`;

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `${title} for ${member.user.tag} (${member.id})`,
    permissionOverwrites: createTicketOverwrites(guild, member),
    reason: `Ticket opened by ${member.user.tag}: ${reason}`
  });

  const mentionRoles = getRolesByName(guild, mentionRoleNames);
  const ticketMeta = {
    channelId: channel.id,
    ownerId: member.id,
    title,
    intro,
    reason,
    messageId: null,
    handledBy: null,
    resolutionMessageId: null,
    resolutionEnabled,
    createdAt: new Date().toISOString()
  };

  const ticketMessage = await channel.send({
    content: [member, ...mentionRoles].map((mentionable) => `${mentionable}`).join(" "),
    embeds: [createTicketEmbed(ticketMeta)],
    components: [createCloseTicketRow(ticketMeta)],
    allowedMentions: {
      users: [member.id],
      roles: mentionRoles.map((role) => role.id)
    }
  });

  await updateGuildState(guild.id, (guildState) => {
    guildState.tickets.openByUser[member.id] = channel.id;
    guildState.tickets.metaByChannel[channel.id] = {
      ...ticketMeta,
      messageId: ticketMessage.id
    };
  });

  await sendLog(guild, {
    title: "Ticket Opened",
    description: `${member.user.tag} opened ${channel}.`,
    fields: [{ name: "Reason", value: reason.slice(0, 1024) }],
    color: 0x3498db
  });

  return {
    channel,
    alreadyOpen: false,
    embed: successEmbed("Ticket Created", `Your ticket has been opened: ${channel}`)
  };
}

export function createApplicationTicket(guild, member) {
  return createTicket(guild, member, "Application ticket opened", {
    title: "Application Ticket",
    intro: "Thanks for applying. Share what role you want, your experience, examples of your work, and anything else staff should know.",
    channelPrefix: "apply",
    mentionRoleNames: roleGroups.ownership,
    resolutionEnabled: false
  });
}

function memberHasSupportRole(member) {
  return roleGroups.support.some((roleName) =>
    member.roles.cache.some((role) => role.name === roleName)
  );
}

export async function closeTicket(guild, channel, member, reason = "No reason provided") {
  const { ownerEntry, ownerId, isTicketChannel } = await getTicketInfo(guild, channel);
  const canClose =
    member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    memberHasSupportRole(member) ||
    ownerId === member.id;

  if (!isTicketChannel) {
    throw new Error("This command can only be used inside a ticket channel.");
  }

  if (!canClose) {
    throw new Error("You do not have permission to close this ticket.");
  }

  await updateGuildState(guild.id, (guildState) => {
    if (ownerEntry) {
      delete guildState.tickets.openByUser[ownerEntry[0]];
    }
    delete guildState.tickets.metaByChannel[channel.id];
  });

  await sendLog(guild, {
    title: "Ticket Closed",
    description: `${member.user.tag} closed ${channel.name}.`,
    fields: [{ name: "Reason", value: reason.slice(0, 1024) }],
    color: 0xe67e22
  });

  await channel.send({
    embeds: [
      successEmbed("Ticket Closing", `This ticket will be deleted in 5 seconds.\nReason: ${reason}`)
    ]
  }).catch(() => null);

  setTimeout(() => {
    channel.delete(`Ticket closed by ${member.user.tag}: ${reason}`).catch(() => null);
  }, 5000);

  return successEmbed("Ticket Closed", "The ticket is being closed.");
}

export async function handleTicket(guild, channel, member) {
  const { ownerId, isTicketChannel, meta } = await getTicketInfo(guild, channel);

  if (!isTicketChannel) {
    throw new Error("This button can only be used inside a ticket channel.");
  }

  if (!ticketResolutionEnabled(meta)) {
    throw new Error("Application tickets use the application accept and deny commands.");
  }

  if (!memberCanHandleTicket(member)) {
    throw new Error("Only staff or support can handle tickets.");
  }

  if (meta.handledBy && meta.handledBy !== member.id) {
    throw new Error(`This ticket is already handled by <@${meta.handledBy}>.`);
  }

  const updatedMeta = {
    ...meta,
    ownerId,
    handledBy: member.id
  };

  await updateGuildState(guild.id, (guildState) => {
    guildState.tickets.metaByChannel[channel.id] = updatedMeta;
  });

  await refreshTicketMessage(channel, updatedMeta);
  await sendLog(guild, {
    title: "Ticket Claimed",
    description: `${member.user.tag} is handling ${channel}.`,
    color: 0x3498db
  });

  return successEmbed("Ticket Claimed", `You are now handling ${channel}.`);
}

export async function markTicketDone(guild, channel, member) {
  const { ownerId, isTicketChannel, meta } = await getTicketInfo(guild, channel);

  if (!isTicketChannel) {
    throw new Error("This button can only be used inside a ticket channel.");
  }

  if (!ticketResolutionEnabled(meta)) {
    throw new Error("Application tickets use the application accept and deny commands.");
  }

  if (!meta.handledBy) {
    throw new Error("Claim this ticket before marking it done.");
  }

  if (meta.handledBy !== member.id) {
    throw new Error(`Only <@${meta.handledBy}> can mark this ticket done because they are handling it.`);
  }

  if (!ownerId) {
    throw new Error("I could not tell who owns this ticket.");
  }

  if (meta.resolutionMessageId) {
    return infoEmbed("Already Waiting", "The ticket owner already has an accept or reject prompt.");
  }

  const resolutionMessage = await channel.send({
    content: `<@${ownerId}>`,
    embeds: [
      infoEmbed("Ticket Ready To Close", `${member} marked this ticket as done. Accept to close it, or reject to keep working in this ticket.`, [
        { name: "Handled By", value: `${member}`, inline: true }
      ])
    ],
    components: [createTicketResolutionRow()],
    allowedMentions: { users: [ownerId], roles: [] }
  });

  const updatedMeta = {
    ...meta,
    ownerId,
    resolutionMessageId: resolutionMessage.id
  };

  await updateGuildState(guild.id, (guildState) => {
    guildState.tickets.metaByChannel[channel.id] = updatedMeta;
  });

  await refreshTicketMessage(channel, updatedMeta);
  await sendLog(guild, {
    title: "Ticket Marked Done",
    description: `${member.user.tag} marked ${channel} done and requested member confirmation.`,
    color: 0x2ecc71
  });

  return successEmbed("Ticket Done", "The ticket owner was asked to accept or reject the resolution.");
}

export async function reviewTicketResolution(guild, channel, member, accepted, resolutionMessage = null) {
  const { ownerId, isTicketChannel, meta } = await getTicketInfo(guild, channel);

  if (!isTicketChannel) {
    throw new Error("This button can only be used inside a ticket channel.");
  }

  if (ownerId !== member.id) {
    throw new Error("Only the ticket owner can accept or reject this resolution.");
  }

  const messageId = meta.resolutionMessageId ?? resolutionMessage?.id;
  const promptMessage = resolutionMessage ??
    (messageId ? await channel.messages.fetch(messageId).catch(() => null) : null);

  await promptMessage?.delete().catch(() => null);

  const updatedMeta = {
    ...meta,
    ownerId,
    resolutionMessageId: null
  };

  await updateGuildState(guild.id, (guildState) => {
    guildState.tickets.metaByChannel[channel.id] = updatedMeta;
  });

  if (accepted) {
    return closeTicket(guild, channel, member, "Ticket marked done and accepted by the ticket owner");
  }

  await refreshTicketMessage(channel, updatedMeta);
  await sendLog(guild, {
    title: "Ticket Resolution Rejected",
    description: `${member.user.tag} rejected the resolution for ${channel}.`,
    color: 0xe74c3c
  });

  return infoEmbed("Ticket Returned", "The accept or reject prompt was removed and the ticket is open again.");
}
