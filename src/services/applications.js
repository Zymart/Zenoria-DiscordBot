import { PermissionFlagsBits } from "discord.js";
import { roleGroups } from "../data/serverTemplate.js";
import { getGuildState } from "../data/store.js";
import { successEmbed, errorEmbed } from "../utils/embeds.js";
import { sendLog } from "./logger.js";
import { assertManageableRole } from "./roleActions.js";
import { closeTicket } from "./tickets.js";

function isApplicationTicketChannel(channel) {
  return channel?.name?.includes("apply-") ||
    channel?.name?.includes("ticket-for-applying") ||
    channel?.topic?.startsWith("Application Ticket");
}

async function inferTicketOwnerId(guild, channel) {
  const state = await getGuildState(guild.id);
  const stateEntry = Object.entries(state.tickets.openByUser).find(
    ([, channelId]) => channelId === channel.id
  );

  if (stateEntry) return stateEntry[0];

  const topicMatch = channel.topic?.match(/\((\d{17,20})\)/);
  return topicMatch?.[1] ?? null;
}

async function resolveApplicant(guild, channel, selectedUser) {
  if (selectedUser) {
    return guild.members.fetch(selectedUser.id);
  }

  const ownerId = await inferTicketOwnerId(guild, channel);
  if (!ownerId) {
    throw new Error("I could not tell who owns this application ticket. Use the user option.");
  }

  return guild.members.fetch(ownerId);
}

function requireApplicationReviewAccess(member) {
  if (member.id === member.guild.ownerId) return;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return;
  if (member.permissions.has(PermissionFlagsBits.ManageRoles)) return;
  if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return;

  throw new Error("You need Manage Roles or Manage Channels to review applications.");
}

function hasSupportRole(member) {
  return roleGroups.support.some((roleName) =>
    member.roles.cache.some((role) => role.name === roleName)
  );
}

function requireTicketCloseAccess(member) {
  if (member.id === member.guild.ownerId) return;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return;
  if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
  if (hasSupportRole(member)) return;

  throw new Error("You need Manage Channels or a staff/support role to close application tickets.");
}

export async function acceptApplication(interaction, { user, role, reason }) {
  if (!isApplicationTicketChannel(interaction.channel)) {
    throw new Error("Use this command inside an application ticket.");
  }

  const reviewer = await interaction.guild.members.fetch(interaction.user.id);
  requireApplicationReviewAccess(reviewer);
  requireTicketCloseAccess(reviewer);
  await assertManageableRole(interaction.guild, reviewer, role, "add");

  const applicant = await resolveApplicant(interaction.guild, interaction.channel, user);

  if (!applicant.roles.cache.has(role.id)) {
    await applicant.roles.add(role, `${interaction.user.tag}: application accepted - ${reason}`);
  }

  await interaction.channel.send({
    content: `${applicant}`,
    embeds: [
      successEmbed("Application Accepted", `${applicant} has been accepted and received ${role}.`, [
        { name: "Reviewed By", value: `${interaction.user}`, inline: true },
        { name: "Reason", value: reason.slice(0, 1024), inline: false }
      ])
    ],
    allowedMentions: { users: [applicant.id], roles: [] }
  });

  await sendLog(interaction.guild, {
    title: "Application Accepted",
    description: `${interaction.user.tag} accepted ${applicant.user.tag} for ${role.name}.`,
    fields: [{ name: "Reason", value: reason.slice(0, 1024) }],
    color: 0x2ecc71
  });

  const closeEmbed = await closeTicket(interaction.guild, interaction.channel, reviewer, "Application accepted");

  return {
    applicant,
    role,
    embed: closeEmbed
  };
}

export async function denyApplication(interaction, { user, reason }) {
  if (!isApplicationTicketChannel(interaction.channel)) {
    throw new Error("Use this command inside an application ticket.");
  }

  const reviewer = await interaction.guild.members.fetch(interaction.user.id);
  requireApplicationReviewAccess(reviewer);
  requireTicketCloseAccess(reviewer);

  const applicant = await resolveApplicant(interaction.guild, interaction.channel, user);

  await interaction.channel.send({
    content: `${applicant}`,
    embeds: [
      errorEmbed("Application Denied", `${applicant}, your application was denied.\n\nReason: ${reason}`)
    ],
    allowedMentions: { users: [applicant.id], roles: [] }
  });

  await sendLog(interaction.guild, {
    title: "Application Denied",
    description: `${interaction.user.tag} denied ${applicant.user.tag}'s application.`,
    fields: [{ name: "Reason", value: reason.slice(0, 1024) }],
    color: 0xe74c3c
  });

  const closeEmbed = await closeTicket(interaction.guild, interaction.channel, reviewer, "Application denied");

  return {
    applicant,
    embed: closeEmbed
  };
}
