import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ThreadAutoArchiveDuration
} from "discord.js";
import { getGuildState, updateGuildState } from "../data/store.js";
import { createEmbed, errorEmbed, infoEmbed, successEmbed } from "../utils/embeds.js";
import { sendLog } from "./logger.js";
import { deleteTaskRecord, loadTaskRecord, saveTaskRecord } from "./storage.js";

export const taskRoleChoices = [
  { name: "Scripter / Programmer", value: "Programmer" },
  { name: "Builder", value: "Builder" },
  { name: "Animator", value: "Animator" },
  { name: "VFX Artist", value: "VFX Artist" },
  { name: "UI Designer", value: "UI Designer" },
  { name: "3D Modeler", value: "3D Modeler" },
  { name: "Sound Designer", value: "Sound Designer" },
  { name: "QA Tester", value: "QA Tester" }
];

const approvalRoleNames = ["Owner", "Co-Owner", "Head Manager", "Lead Developer"];

const finishedTasksChannel = {
  key: "finished-tasks",
  names: ["✅・finished-tasks", "finished-tasks", "finish-tasks", "finish-task", "finished-task"]
};

const taskChannelByRole = {
  Programmer: {
    key: "scripting",
    names: ["💻・scripting", "scripting"]
  },
  Builder: {
    key: "building",
    names: ["🏗・building", "building"]
  },
  Animator: {
    key: "animation",
    names: ["🎞・animation", "animation"]
  },
  "VFX Artist": {
    key: "vfx",
    names: ["✨・vfx", "vfx"]
  },
  "UI Designer": {
    key: "ui-design",
    names: ["🎛・ui-design", "ui-design"]
  },
  "3D Modeler": {
    key: "modeling",
    names: ["🧊・modeling", "modeling"]
  },
  "Sound Designer": {
    key: "audio",
    names: ["🎧・audio", "audio"]
  },
  "QA Tester": {
    key: "testing",
    names: ["🧪・testing", "testing"]
  }
};

function truncate(value, length) {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 3)}...`;
}

function buildThreadName(roleName, title) {
  const cleanTitle = title
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  return truncate(`task-${roleName.toLowerCase().replace(/\s+/g, "-")}-${cleanTitle}`, 90);
}

function getRoleByName(guild, roleName) {
  return guild.roles.cache.find((role) => role.name === roleName);
}

function getApprovalRoles(guild) {
  return approvalRoleNames
    .map((roleName) => getRoleByName(guild, roleName))
    .filter(Boolean);
}

function normalizeChannelName(name) {
  return String(name)
    .toLowerCase()
    .replace(/^[^a-z0-9]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function findTaskChannel(guild, roleName) {
  const mapping = taskChannelByRole[roleName];

  if (!mapping) {
    throw new Error(`No task channel is mapped for ${roleName}.`);
  }

  const state = await getGuildState(guild.id);
  const configuredId = state.channels?.[mapping.key];
  const configuredChannel =
    configuredId &&
    (guild.channels.cache.get(configuredId) ??
      await guild.channels.fetch(configuredId).catch(() => null));

  if (configuredChannel) return configuredChannel;

  const normalizedNames = new Set(mapping.names.map(normalizeChannelName));

  return guild.channels.cache.find((channel) =>
    [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type) &&
    normalizedNames.has(normalizeChannelName(channel.name))
  );
}

function isPostableTaskChannel(channel) {
  return Boolean(
    channel &&
    [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type) &&
    typeof channel.send === "function"
  );
}

async function findFinishedTasksChannel(guild) {
  const state = await getGuildState(guild.id);
  const configuredId = state.channels?.[finishedTasksChannel.key];
  const configuredChannel =
    configuredId &&
    (guild.channels.cache.get(configuredId) ??
      await guild.channels.fetch(configuredId).catch(() => null));

  if (isPostableTaskChannel(configuredChannel)) return configuredChannel;

  await guild.channels.fetch();

  const normalizedNames = new Set(finishedTasksChannel.names.map(normalizeChannelName));

  return guild.channels.cache.find((channel) =>
    isPostableTaskChannel(channel) &&
    normalizedNames.has(normalizeChannelName(channel.name))
  );
}

async function sendFinishedTaskAnnouncement(guild, task, thread, reviewer) {
  const channel = await findFinishedTasksChannel(guild);

  if (!channel) {
    return { posted: false, channel: null };
  }

  const fields = [
    { name: "Task", value: task.title, inline: true },
    { name: "Assigned Role", value: task.roleId ? `<@&${task.roleId}>` : task.roleName, inline: true },
    { name: "Completed By", value: task.completedBy ? `<@${task.completedBy}>` : "Unknown", inline: true },
    { name: "Approved By", value: `${reviewer}`, inline: true },
    { name: "Thread", value: `${thread}`, inline: true }
  ];

  if (task.due) {
    fields.push({ name: "Due", value: task.due, inline: true });
  }

  await channel.send({
    embeds: [
      successEmbed(
        "Finished Task",
        task.details ? truncate(task.details, 1500) : "A completed task was approved by leadership.",
        fields
      )
    ],
    allowedMentions: { parse: [] }
  });

  return { posted: true, channel };
}

function hasRole(member, roleName) {
  return member.roles.cache.some((role) => role.name === roleName);
}

function formatRoleList(roleNames) {
  if (roleNames.length <= 2) return roleNames.join(" or ");

  return `${roleNames.slice(0, -1).join(", ")}, or ${roleNames.at(-1)}`;
}

function canSubmitAnyTask(member) {
  return (
    member.id === member.guild.ownerId ||
    approvalRoleNames.some((roleName) => hasRole(member, roleName))
  );
}

function canApprove(member) {
  return canSubmitAnyTask(member);
}

function getStoredTaskRole(guild, task) {
  return task.roleId ? guild.roles.cache.get(task.roleId) ?? null : null;
}

function getTaskRoleNameFromStoredChannel(state, task) {
  if (!task.channelId) return null;

  return Object.entries(taskChannelByRole)
    .find(([, mapping]) => state.channels?.[mapping.key] === task.channelId)
    ?.[0] ?? null;
}

async function resolveAssignedTaskRole(guild, task) {
  const state = await getGuildState(guild.id).catch(() => null);
  const roleName = state ? getTaskRoleNameFromStoredChannel(state, task) ?? task.roleName : task.roleName;
  const roleByName = roleName ? getRoleByName(guild, roleName) : null;

  return roleByName ?? getStoredTaskRole(guild, task);
}

function getEmbedField(embed, fieldName) {
  return embed.fields?.find((field) => field.name === fieldName)?.value ?? null;
}

function mentionId(value, pattern) {
  return String(value || "").match(pattern)?.[1] ?? null;
}

function getTaskRoleNameFromChannel(channel) {
  if (!channel) return null;

  const normalizedChannelName = normalizeChannelName(channel.name);
  return Object.entries(taskChannelByRole)
    .find(([, mapping]) => mapping.names.map(normalizeChannelName).includes(normalizedChannelName))
    ?.[0] ?? null;
}

async function restoreTaskFromMessage(guild, taskId, { channel, message } = {}) {
  if (!channel?.isThread?.() || !message) return null;

  const embed = message.embeds?.[0];
  const title = embed?.title?.replace(/^Task:\s*/i, "").trim();
  if (!title) return null;

  const assignedRoleValue = getEmbedField(embed, "Assigned Role");
  const roleId = mentionId(assignedRoleValue, /<@&(\d{17,20})>/);
  const assignedRole = roleId ? guild.roles.cache.get(roleId) : null;
  const parentChannel = channel.parent ??
    (channel.parentId ? await guild.channels.fetch(channel.parentId).catch(() => null) : null);
  const roleName = assignedRole?.name ?? getTaskRoleNameFromChannel(parentChannel) ?? assignedRoleValue ?? "Unknown";
  const createdBy = mentionId(getEmbedField(embed, "Created By"), /<@!?(\d{17,20})>/);

  if (!createdBy) return null;

  return {
    id: taskId,
    title,
    details: embed.description || "No details saved.",
    due: getEmbedField(embed, "Due"),
    roleName,
    roleId: assignedRole?.id ?? roleId ?? null,
    channelId: parentChannel?.id ?? channel.parentId ?? null,
    threadId: channel.id,
    messageId: message.id,
    status: "open",
    createdBy,
    createdAt: message.createdAt?.toISOString?.() ?? new Date(message.createdTimestamp ?? Date.now()).toISOString()
  };
}

function hasAssignedTaskRole(member, task, assignedRole) {
  if (assignedRole) return member.roles.cache.has(assignedRole.id);

  return hasRole(member, task.roleName);
}

function taskStatusLabel(status) {
  switch (status) {
    case "pending_approval":
      return "Awaiting approval";
    case "approved":
      return "Approved";
    case "rejected":
      return "Needs changes";
    default:
      return "Open";
  }
}

function getTaskHandlerId(task) {
  return task.handledBy ?? task.completedBy ?? null;
}

function buildTaskEmbed(guild, task) {
  const assignedRole = task.roleId ? `<@&${task.roleId}>` : task.roleName;
  const leadershipRoles = getApprovalRoles(guild);
  const leadershipMentions = leadershipRoles.map((role) => `${role}`).join(" ");
  const fields = [
    { name: "Assigned Role", value: assignedRole, inline: true },
    { name: "Created By", value: `<@${task.createdBy}>`, inline: true },
    { name: "Status", value: taskStatusLabel(task.status), inline: true },
    {
      name: "Leadership",
      value: leadershipMentions || "Owner, Co-Owner, Head Manager, Lead Developer",
      inline: false
    }
  ];

  if (task.due) {
    fields.push({ name: "Due", value: task.due, inline: true });
  }

  const handlerId = getTaskHandlerId(task);
  if (handlerId) {
    fields.push({ name: "Handled By", value: `<@${handlerId}>`, inline: true });
  }

  return createEmbed({
    title: `Task: ${task.title}`,
    description: task.details,
    fields
  });
}

function doneButton(taskId, { disabled = false, label = "Done" } = {}) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`task:done:${taskId}`)
      .setLabel(label)
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled)
  );
}

function approvalButtons(taskId, { disabled = false } = {}) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`task:approve:${taskId}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`task:reject:${taskId}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

async function getStoredTask(guild, taskId, context = {}) {
  const state = await getGuildState(guild.id);
  const task = state.tasks.items[taskId];

  if (task) return task;

  const storedTask = await loadTaskRecord(guild.id, taskId).catch((error) => {
    console.error("Could not load task record from Supabase Storage:", error);
    return null;
  });

  const restoredTask = storedTask ?? await restoreTaskFromMessage(guild, taskId, context);

  if (restoredTask) {
    await updateGuildState(guild.id, (guildState) => {
      guildState.tasks.items[taskId] = restoredTask;
      const numericTaskId = Number.parseInt(taskId, 10);
      if (Number.isInteger(numericTaskId)) {
        guildState.tasks.counter = Math.max(guildState.tasks.counter, numericTaskId);
      }
    });
    await saveTaskRecordQuietly(guild, restoredTask);

    return restoredTask;
  }

  throw new Error("That task could not be found in the bot state, saved task storage, or task message.");
}

async function deleteStoredTask(guildId, taskId) {
  await updateGuildState(guildId, (guildState) => {
    delete guildState.tasks.items[taskId];
  });
}

async function saveTaskRecordQuietly(guild, task) {
  try {
    return await saveTaskRecord(guild.id, task);
  } catch (error) {
    console.error("Could not save task record to Supabase Storage:", error);
    await sendLog(guild, {
      title: "Task Storage Error",
      description: "I could not save the task record to Supabase Storage.",
      fields: [
        { name: "Task", value: task.title ?? task.id, inline: true },
        { name: "Error", value: truncate(error.message || "Unknown error", 1024), inline: false }
      ],
      color: 0xe74c3c
    }).catch(() => null);
    return null;
  }
}

async function deleteTaskRecordQuietly(guild, taskId) {
  try {
    return await deleteTaskRecord(guild.id, taskId);
  } catch (error) {
    console.error("Could not delete task record from Supabase Storage:", error);
    await sendLog(guild, {
      title: "Task Storage Cleanup Error",
      description: "I could not delete the finished task record from Supabase Storage.",
      fields: [{ name: "Error", value: truncate(error.message || "Unknown error", 1024), inline: false }],
      color: 0xe74c3c
    }).catch(() => null);
    return null;
  }
}

async function fetchThread(guild, task) {
  const channel = guild.channels.cache.get(task.threadId) ??
    await guild.channels.fetch(task.threadId).catch(() => null);

  if (!channel?.isThread()) {
    throw new Error("The task thread could not be found.");
  }

  return channel;
}

async function editTaskMessage(guild, task, row, { refreshEmbed = false } = {}) {
  const thread = await fetchThread(guild, task).catch(() => null);
  if (!thread) return;

  const message = await thread.messages.fetch(task.messageId).catch(() => null);
  if (!message) return;

  const payload = { components: [row] };
  if (refreshEmbed) {
    payload.embeds = [buildTaskEmbed(guild, task)];
  }

  await message.edit(payload).catch(() => null);
}

function validateTaskChannel(channel) {
  if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
    throw new Error("Use /task inside a normal text channel where the bot can create public threads.");
  }
}

export async function createTaskThread(guild, actor, { roleName, title, details, due }) {
  await guild.channels.fetch();
  await guild.roles.fetch();

  const assignedRole = getRoleByName(guild, roleName);
  if (!assignedRole) {
    throw new Error(`The ${roleName} role does not exist yet. Run /role_setup first.`);
  }

  const channel = await findTaskChannel(guild, roleName);
  validateTaskChannel(channel);

  const taskId = await updateGuildState(guild.id, (guildState) => {
    guildState.tasks.counter += 1;
    return String(guildState.tasks.counter);
  });
  const thread = await channel.threads.create({
    name: buildThreadName(roleName, title),
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
    reason: `${actor.tag} created a Zenoria task`
  });
  const leadershipRoles = getApprovalRoles(guild);
  const mentionRoleIds = [assignedRole.id, ...leadershipRoles.map((role) => role.id)];
  const taskDraft = {
    id: taskId,
    title,
    details,
    due: due ?? null,
    roleName,
    roleId: assignedRole.id,
    status: "open",
    createdBy: actor.id,
    createdAt: new Date().toISOString()
  };

  const taskMessage = await thread.send({
    content: [assignedRole, ...leadershipRoles].map((role) => `${role}`).join(" "),
    embeds: [buildTaskEmbed(guild, taskDraft)],
    components: [doneButton(taskId)],
    allowedMentions: { roles: mentionRoleIds, users: [actor.id] }
  });

  const storedTask = {
    ...taskDraft,
    channelId: channel.id,
    threadId: thread.id,
    messageId: taskMessage.id,
  };

  await updateGuildState(guild.id, (guildState) => {
    guildState.tasks.items[taskId] = storedTask;
  });
  await saveTaskRecordQuietly(guild, storedTask);

  await sendLog(guild, {
    title: "Task Created",
    description: `${actor.tag} created a task for ${roleName}.`,
    fields: [
      { name: "Task", value: title, inline: true },
      { name: "Thread", value: `${thread}`, inline: true }
    ],
    color: 0x3498db
  });

  return {
    thread,
    embed: successEmbed("Task Created", `Created ${thread} and pinged ${assignedRole}.`)
  };
}

export async function submitTaskForApproval(guild, member, taskId, context = {}) {
  await guild.roles.fetch();

  const task = await getStoredTask(guild, taskId, context);

  if (task.status === "pending_approval") {
    return infoEmbed("Already Submitted", "This task is already waiting for approval.");
  }

  if (task.status === "approved") {
    return successEmbed("Already Approved", "This task has already been approved.");
  }

  const handlerId = getTaskHandlerId(task);
  const canOverrideSubmission = canSubmitAnyTask(member);

  if (handlerId && handlerId !== member.id && !canOverrideSubmission) {
    throw new Error(`Only <@${handlerId}> can mark this task as done because they are handling it.`);
  }

  const assignedRole = await resolveAssignedTaskRole(guild, task);
  if (!canOverrideSubmission && !hasAssignedTaskRole(member, task, assignedRole)) {
    const assignedRoleName = assignedRole?.name ?? task.roleName ?? "assigned specialty";
    throw new Error(
      `Only members with the ${assignedRoleName} role, leadership (${formatRoleList(approvalRoleNames)}), or the server owner can mark this task as done.`
    );
  }

  const normalizedTask = assignedRole
    ? { ...task, roleName: assignedRole.name, roleId: assignedRole.id }
    : task;

  const thread = await fetchThread(guild, normalizedTask);
  const approvalRoles = getApprovalRoles(guild);
  const approvalMentions = approvalRoles.map((role) => `${role}`).join(" ");
  const approvalMessage = await thread.send({
    content: approvalMentions || "Approval requested.",
    embeds: [
      infoEmbed("Task Ready For Approval", `${member} marked this task as done. Owner, Co-Owner, Head Manager, or Lead Developer must approve it.`, [
        { name: "Task", value: task.title, inline: true },
        { name: "Handled By", value: `${member}`, inline: true }
      ])
    ],
    components: [approvalButtons(taskId)],
    allowedMentions: { roles: approvalRoles.map((role) => role.id), users: [member.id] }
  });

  const updatedTask = {
    ...normalizedTask,
    status: "pending_approval",
    handledBy: handlerId ?? member.id,
    completedBy: member.id,
    completedAt: new Date().toISOString(),
    approvalMessageId: approvalMessage.id
  };

  await updateGuildState(guild.id, (guildState) => {
    guildState.tasks.items[taskId] = updatedTask;
  });
  await saveTaskRecordQuietly(guild, updatedTask);

  await editTaskMessage(guild, updatedTask, doneButton(taskId, {
    disabled: true,
    label: "Awaiting Approval"
  }), { refreshEmbed: true });

  return successEmbed("Sent For Approval", "The approval team has been pinged in the task thread.");
}

export async function reviewTask(guild, member, taskId, approved) {
  await guild.roles.fetch();

  const task = await getStoredTask(guild, taskId);

  if (!canApprove(member)) {
    throw new Error("Only Owner, Co-Owner, Head Manager, or Lead Developer can approve tasks.");
  }

  if (task.status !== "pending_approval") {
    throw new Error("This task is not waiting for approval.");
  }

  const thread = await fetchThread(guild, task);
  const nextStatus = approved ? "approved" : "rejected";
  const updatedTask = {
    ...task,
    status: nextStatus,
    reviewedBy: member.id,
    reviewedAt: new Date().toISOString(),
    approvalMessageId: null
  };

  await updateGuildState(guild.id, (guildState) => {
    guildState.tasks.items[taskId] = updatedTask;
  });

  if (task.approvalMessageId) {
    const approvalMessage = await thread.messages.fetch(task.approvalMessageId).catch(() => null);
    await approvalMessage?.delete().catch(() => null);
  }

  await editTaskMessage(guild, updatedTask, doneButton(taskId, {
    disabled: approved,
    label: approved ? "Approved" : "Done"
  }), { refreshEmbed: true });

  const handlerId = getTaskHandlerId(updatedTask);
  const rejectedMessage = handlerId
    ? `${member} rejected this task. <@${handlerId}> can mark it done again after fixing it.`
    : `${member} rejected this task. The assigned team can mark it done again after fixing it.`;

  await thread.send({
    embeds: [
      approved
        ? successEmbed("Task Approved", `${member} approved this task.`)
        : errorEmbed("Task Rejected", rejectedMessage)
    ],
    allowedMentions: handlerId ? { users: [handlerId] } : { parse: [] }
  });

  let finishedAnnouncement = { posted: false, channel: null };

  if (approved) {
    try {
      finishedAnnouncement = await sendFinishedTaskAnnouncement(guild, updatedTask, thread, member);
    } catch (error) {
      finishedAnnouncement = { posted: false, channel: null, error };
    }
  }

  const logFields = [{ name: "Thread", value: `${thread}`, inline: true }];

  if (finishedAnnouncement.channel) {
    logFields.push({ name: "Finished Channel", value: `${finishedAnnouncement.channel}`, inline: true });
  }

  if (finishedAnnouncement.error) {
    logFields.push({
      name: "Finished Post Error",
      value: truncate(finishedAnnouncement.error.message || "Unknown error", 1024),
      inline: false
    });
  }

  await sendLog(guild, {
    title: approved ? "Task Approved" : "Task Rejected",
    description: `${member.user.tag} ${approved ? "approved" : "rejected"} task "${task.title}".`,
    fields: logFields,
    color: approved ? 0x2ecc71 : 0xe74c3c
  });

  if (!approved) {
    await saveTaskRecordQuietly(guild, updatedTask);

    return errorEmbed(
      "Task Rejected",
      handlerId
        ? `<@${handlerId}> can submit it again after fixing it.`
        : "The assigned team can submit it again after fixing it."
    );
  }

  if (finishedAnnouncement.posted) {
    await deleteTaskRecordQuietly(guild, taskId);
    await deleteStoredTask(guild.id, taskId);
    return successEmbed("Task Approved", `The task was approved and posted in ${finishedAnnouncement.channel}.`);
  }

  await saveTaskRecordQuietly(guild, updatedTask);

  if (finishedAnnouncement.error) {
    return successEmbed(
      "Task Approved",
      `The task was approved, but I could not post it in the finished-tasks channel: ${finishedAnnouncement.error.message}`
    );
  }

  return successEmbed(
    "Task Approved",
    "The task was approved. Run `/channels_setup` to create the finished-tasks channel for future announcements."
  );
}
