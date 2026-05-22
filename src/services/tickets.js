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

export function createCloseTicketRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:close")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );
}

export async function createTicket(
  guild,
  member,
  reason = "No reason provided",
  {
    title = "Support Ticket",
    intro = "A staff member will help you here. Use the button below when this ticket is finished.",
    channelPrefix = "ticket"
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

  await updateGuildState(guild.id, (guildState) => {
    guildState.tickets.openByUser[member.id] = channel.id;
  });

  await channel.send({
    content: `${member}`,
    embeds: [
      infoEmbed(title, intro, [
        { name: "Opened By", value: `${member}`, inline: true },
        { name: "Reason", value: reason.slice(0, 1024), inline: false }
      ])
    ],
    components: [createCloseTicketRow()]
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
    channelPrefix: "apply"
  });
}

function memberHasSupportRole(member) {
  return roleGroups.support.some((roleName) =>
    member.roles.cache.some((role) => role.name === roleName)
  );
}

export async function closeTicket(guild, channel, member, reason = "No reason provided") {
  const state = await getGuildState(guild.id);
  const ownerEntry = Object.entries(state.tickets.openByUser).find(
    ([, channelId]) => channelId === channel.id
  );
  const isTicketChannel = Boolean(ownerEntry) || channel.name.includes("ticket-");
  const canClose =
    member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    memberHasSupportRole(member) ||
    ownerEntry?.[0] === member.id;

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
