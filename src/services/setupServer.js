import { ChannelType, PermissionFlagsBits } from "discord.js";
import { config } from "../config.js";
import {
  deprecatedChannelDefinitions,
  roleDefinitions,
  roleGroups,
  styledCategoryDefinitions as categoryDefinitions
} from "../data/serverTemplate.js";
import { getGuildState, updateGuildState } from "../data/store.js";
import { infoEmbed, successEmbed } from "../utils/embeds.js";
import { createFaqPanelPayload } from "./faq.js";
import { sendLog } from "./logger.js";
import { createApplicationTicketPanelRow, createTicketPanelRow } from "./tickets.js";
import { createVerificationRow } from "./verification.js";

const textAllow = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory
];

const textUploadAllow = [
  ...textAllow,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.CreatePrivateThreads,
  PermissionFlagsBits.SendMessagesInThreads
];

const staffAllow = [
  ...textUploadAllow,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageThreads
];

const voiceAllow = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
  PermissionFlagsBits.Stream,
  PermissionFlagsBits.UseVAD
];

function definitionKey(definition) {
  return definition.key ?? definition.name;
}

function normalizeLookupName(name) {
  return String(name)
    .toLowerCase()
    .replace(/^[^a-z0-9]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function candidateNames(definition) {
  if (typeof definition === "string") return [definition];

  return [
    definition.name,
    definition.key,
    ...(definition.aliases ?? [])
  ].filter(Boolean);
}

function findRole(guild, roleName) {
  return guild.roles.cache.find((role) => role.name === roleName && !role.managed);
}

function getGroupRoles(roleMap, groupNames) {
  return groupNames.map((name) => roleMap.get(name)).filter(Boolean);
}

function permissionRoleNames(...specialtyNames) {
  return ["Owner", "Co-Owner", "Head Manager", "Lead Developer", ...specialtyNames];
}

function createOverwriteCollector(guild) {
  const byId = new Map();

  function ensure(id) {
    if (!byId.has(id)) {
      byId.set(id, { id, allow: new Set(), deny: new Set() });
    }

    return byId.get(id);
  }

  return {
    allow(id, permissions) {
      const entry = ensure(id);
      for (const permission of permissions) {
        entry.allow.add(permission);
        entry.deny.delete(permission);
      }
    },
    deny(id, permissions) {
      const entry = ensure(id);
      for (const permission of permissions) {
        entry.deny.add(permission);
        entry.allow.delete(permission);
      }
    },
    allowRoles(roles, permissions) {
      for (const role of roles) this.allow(role.id, permissions);
    },
    denyEveryone(permissions) {
      this.deny(guild.roles.everyone.id, permissions);
    },
    allowEveryone(permissions) {
      this.allow(guild.roles.everyone.id, permissions);
    },
    toArray() {
      return [...byId.values()].map((entry) => ({
        id: entry.id,
        allow: [...entry.allow],
        deny: [...entry.deny]
      }));
    }
  };
}

function buildOverwrites(guild, roleMap, profile) {
  const overwrites = createOverwriteCollector(guild);
  const staffRoles = getGroupRoles(roleMap, roleGroups.staff);
  const communityRoles = getGroupRoles(roleMap, roleGroups.community);
  const devRoles = getGroupRoles(roleMap, roleGroups.development);
  const botRoles = getGroupRoles(roleMap, roleGroups.bots);

  const allowStaff = () => overwrites.allowRoles(staffRoles, staffAllow);
  const allowBots = () => overwrites.allowRoles(botRoles, staffAllow);
  const hideFromEveryone = () => overwrites.denyEveryone([PermissionFlagsBits.ViewChannel]);

  switch (profile) {
    case "information":
      overwrites.allowEveryone([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory
      ]);
      overwrites.denyEveryone([
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.CreatePublicThreads,
        PermissionFlagsBits.CreatePrivateThreads
      ]);
      allowStaff();
      allowBots();
      break;
    case "community":
    case "game":
      hideFromEveryone();
      overwrites.allowRoles(communityRoles, textUploadAllow);
      allowStaff();
      allowBots();
      break;
    case "supportChannel":
      hideFromEveryone();
      overwrites.allowRoles(communityRoles, textUploadAllow);
      overwrites.allowRoles(getGroupRoles(roleMap, roleGroups.support), staffAllow);
      allowBots();
      break;
    case "development":
      hideFromEveryone();
      overwrites.allowRoles(
        getGroupRoles(roleMap, permissionRoleNames(
          "Programmer",
          "Builder",
          "Animator",
          "VFX Artist",
          "UI Designer",
          "3D Modeler",
          "Sound Designer",
          "QA Tester"
        )),
        textUploadAllow
      );
      allowBots();
      break;
    case "leadDevelopment":
      hideFromEveryone();
      overwrites.allowRoles(getGroupRoles(roleMap, ["Owner", "Co-Owner", "Head Manager", "Lead Developer"]), textUploadAllow);
      allowBots();
      break;
    case "creativeDevelopment":
      hideFromEveryone();
      overwrites.allowRoles(
        getGroupRoles(roleMap, permissionRoleNames(
          "Builder",
          "Animator",
          "VFX Artist",
          "UI Designer",
          "3D Modeler",
          "Sound Designer"
        )),
        textUploadAllow
      );
      allowBots();
      break;
    case "scripting":
      hideFromEveryone();
      overwrites.allowRoles(getGroupRoles(roleMap, permissionRoleNames("Programmer")), textUploadAllow);
      allowBots();
      break;
    case "building":
      hideFromEveryone();
      overwrites.allowRoles(getGroupRoles(roleMap, permissionRoleNames("Builder")), textUploadAllow);
      allowBots();
      break;
    case "animation":
      hideFromEveryone();
      overwrites.allowRoles(getGroupRoles(roleMap, permissionRoleNames("Animator")), textUploadAllow);
      allowBots();
      break;
    case "modeling":
      hideFromEveryone();
      overwrites.allowRoles(getGroupRoles(roleMap, permissionRoleNames("3D Modeler")), textUploadAllow);
      allowBots();
      break;
    case "uiDesign":
      hideFromEveryone();
      overwrites.allowRoles(getGroupRoles(roleMap, permissionRoleNames("UI Designer")), textUploadAllow);
      allowBots();
      break;
    case "vfx":
      hideFromEveryone();
      overwrites.allowRoles(getGroupRoles(roleMap, permissionRoleNames("VFX Artist")), textUploadAllow);
      allowBots();
      break;
    case "audio":
      hideFromEveryone();
      overwrites.allowRoles(getGroupRoles(roleMap, permissionRoleNames("Sound Designer")), textUploadAllow);
      allowBots();
      break;
    case "testing":
      hideFromEveryone();
      overwrites.allowRoles(getGroupRoles(roleMap, permissionRoleNames("QA Tester", "Beta Tester")), textAllow);
      allowBots();
      break;
    case "internalBugs":
      hideFromEveryone();
      overwrites.allowRoles(getGroupRoles(roleMap, permissionRoleNames("QA Tester")), textUploadAllow);
      allowBots();
      break;
    case "staff":
      hideFromEveryone();
      allowStaff();
      allowBots();
      break;
    case "communityVoice":
      hideFromEveryone();
      overwrites.allowRoles(communityRoles, voiceAllow);
      overwrites.allowRoles(staffRoles, [...voiceAllow, PermissionFlagsBits.MoveMembers]);
      allowBots();
      break;
    case "developmentVoice":
      hideFromEveryone();
      overwrites.allowRoles(devRoles, voiceAllow);
      overwrites.allowRoles(staffRoles, [...voiceAllow, PermissionFlagsBits.MoveMembers]);
      allowBots();
      break;
    case "staffVoice":
      hideFromEveryone();
      overwrites.allowRoles(staffRoles, [...voiceAllow, PermissionFlagsBits.MoveMembers]);
      allowBots();
      break;
    case "tickets":
      hideFromEveryone();
      overwrites.allowRoles(getGroupRoles(roleMap, roleGroups.support), staffAllow);
      allowBots();
      break;
    default:
      hideFromEveryone();
      allowStaff();
      allowBots();
      break;
  }

  return overwrites.toArray();
}

export async function ensureRoles(guild) {
  const roleMap = new Map();
  const created = [];
  const updated = [];
  const skipped = [];

  for (const definition of roleDefinitions) {
    let role = findRole(guild, definition.name);

    if (!role) {
      role = await guild.roles.create({
        name: definition.name,
        colors: { primaryColor: definition.color },
        hoist: definition.hoist ?? false,
        mentionable: definition.mentionable ?? false,
        permissions: definition.permissions,
        reason: "Zenoria official server setup"
      });
      created.push(role.name);
    } else {
      if (role.editable) {
        await role.edit({
          colors: { primaryColor: definition.color },
          hoist: definition.hoist ?? role.hoist,
          mentionable: definition.mentionable ?? role.mentionable,
          permissions: definition.permissions
        }, "Zenoria official server permission sync");
        updated.push(role.name);
      } else {
        skipped.push(role.name);
      }
    }

    roleMap.set(definition.name, role);
  }

  for (let index = roleDefinitions.length - 1; index >= 0; index -= 1) {
    const definition = roleDefinitions[index];
    const role = roleMap.get(definition.name);
    const targetPosition = roleDefinitions.length - index;
    if (role?.editable) {
      await role.setPosition(targetPosition, { reason: "Zenoria role hierarchy sync" }).catch(() => null);
    }
  }

  return { roleMap, created, updated, skipped };
}

function findChannel(guild, definition, type) {
  const names = candidateNames(definition);
  const normalizedNames = new Set(names.map(normalizeLookupName).filter(Boolean));

  return guild.channels.cache.find((channel) => {
    if (channel.type !== type) return false;
    if (names.includes(channel.name)) return true;

    return normalizedNames.has(normalizeLookupName(channel.name));
  });
}

async function deleteExistingChannels(guild, protectedChannelIds) {
  const protectedIds = new Set(protectedChannelIds.filter(Boolean));
  const channels = [...guild.channels.cache.values()];
  const deletableChannels = channels
    .filter((channel) => !protectedIds.has(channel.id))
    .filter((channel) => channel.deletable);
  const skippedChannels = channels
    .filter((channel) => !protectedIds.has(channel.id))
    .filter((channel) => !channel.deletable);
  const orderedChannels = [
    ...deletableChannels.filter((channel) => channel.type !== ChannelType.GuildCategory),
    ...deletableChannels.filter((channel) => channel.type === ChannelType.GuildCategory)
  ];
  const deleted = [];
  const failed = [];

  for (const channel of orderedChannels) {
    try {
      await channel.delete("Zenoria setup channel rebuild");
      deleted.push(channel.name);
    } catch (error) {
      failed.push(`${channel.name}: ${error.message}`);
    }
  }

  return {
    deleted,
    failed,
    skipped: skippedChannels.map((channel) => channel.name),
    protectedCount: [...protectedIds].filter((id) => guild.channels.cache.has(id)).length
  };
}

async function ensureCategory(guild, roleMap, definition) {
  const overwrites = buildOverwrites(guild, roleMap, definition.profile);
  let category = findChannel(guild, definition, ChannelType.GuildCategory);
  let created = false;

  if (!category) {
    category = await guild.channels.create({
      name: definition.name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: overwrites,
      reason: "Zenoria official server setup"
    });
    created = true;
  } else {
    if (category.name !== definition.name) {
      await category.edit({ name: definition.name }, "Zenoria category name sync");
    }

    await category.permissionOverwrites.set(overwrites, "Zenoria category permission sync");
  }

  return { category, created };
}

async function ensureChannel(guild, roleMap, category, categoryDefinition, channelDefinition) {
  const type = channelDefinition.type ?? ChannelType.GuildText;
  const profile = channelDefinition.profile ?? categoryDefinition.profile;
  const overwrites = buildOverwrites(guild, roleMap, profile);
  let channel = findChannel(guild, channelDefinition, type);
  let created = false;

  const channelPayload = {
    name: channelDefinition.name,
    type,
    parent: category.id,
    permissionOverwrites: overwrites,
    reason: "Zenoria official server setup"
  };

  if (type === ChannelType.GuildText && channelDefinition.topic) {
    channelPayload.topic = channelDefinition.topic;
  }

  if (!channel) {
    channel = await guild.channels.create(channelPayload);
    created = true;
  } else {
    await channel.edit({
      name: channelDefinition.name,
      parent: category.id,
      topic: type === ChannelType.GuildText ? channelDefinition.topic ?? channel.topic : undefined
    }, "Zenoria channel structure sync");
    await channel.permissionOverwrites.set(overwrites, "Zenoria channel permission sync");
  }

  return { channel, created };
}

async function deleteDeprecatedChannels(guild) {
  const deleted = [];
  const failed = [];

  for (const definition of deprecatedChannelDefinitions) {
    const channel = findChannel(guild, definition, ChannelType.GuildText);

    if (!channel) continue;

    try {
      await channel.delete("Zenoria channels_setup removed deprecated channel");
      deleted.push(channel.name);
    } catch (error) {
      failed.push(`${channel.name}: ${error.message}`);
    }
  }

  return { deleted, failed };
}

async function assignDefaultRoles(guild, roleMap) {
  const ownerRole = roleMap.get("Owner");
  const botsRole = roleMap.get("Bots");
  const botMember = guild.members.me;

  if (ownerRole) {
    const ownerMember = await guild.members.fetch(guild.ownerId).catch(() => null);
    if (ownerMember && ownerRole.editable && !ownerMember.roles.cache.has(ownerRole.id)) {
      await ownerMember.roles.add(ownerRole, "Zenoria setup owner role assignment").catch(() => null);
    }
  }

  if (botMember && botsRole?.editable && !botMember.roles.cache.has(botsRole.id)) {
    await botMember.roles.add(botsRole, "Zenoria setup bot role assignment").catch(() => null);
  }
}

async function ensurePanelMessage(channel, existingMessageId, payload) {
  if (existingMessageId) {
    const existing = await channel.messages.fetch(existingMessageId).catch(() => null);
    if (existing) return existing.id;
  }

  const message = await channel.send(payload);
  return message.id;
}

async function ensurePanels(guild, state) {
  const verifyChannelId =
    state.channels[config.setup.verifyChannelKey] ??
    state.channels[config.setup.verifyChannelName] ??
    state.channels[config.setup.welcomeChannelKey] ??
    state.channels[config.setup.welcomeChannelName];
  const supportChannelId =
    state.channels[config.setup.supportChannelKey] ??
    state.channels[config.setup.supportChannelName];
  const applicationTicketChannelId = state.channels["ticket-for-applying"];
  const faqChannelId = state.channels.faq;
  const verifyChannel = verifyChannelId && guild.channels.cache.get(verifyChannelId);
  const supportChannel = supportChannelId && guild.channels.cache.get(supportChannelId);
  const applicationTicketChannel =
    applicationTicketChannelId && guild.channels.cache.get(applicationTicketChannelId);
  const faqChannel = faqChannelId && guild.channels.cache.get(faqChannelId);
  const panels = {};

  if (verifyChannel?.isTextBased()) {
    panels.verificationMessageId = await ensurePanelMessage(
      verifyChannel,
      state.panels.verificationMessageId,
      {
        embeds: [
          infoEmbed(
            "Verify Your Account",
            `Welcome to the official ${config.brandName} Roblox community. Verify to unlock community channels, voice chats, and game support.`
          )
        ],
        components: [createVerificationRow()]
      }
    );
  }

  if (supportChannel?.isTextBased()) {
    panels.ticketMessageId = await ensurePanelMessage(
      supportChannel,
      state.panels.ticketMessageId,
      {
        embeds: [
          infoEmbed(
            "Support Tickets",
            "Open a private ticket for account help, bug follow-up, player reports, partnership questions, or staff support."
          )
        ],
        components: [createTicketPanelRow()]
      }
    );
  }

  if (applicationTicketChannel?.isTextBased()) {
    panels.applicationTicketMessageId = await ensurePanelMessage(
      applicationTicketChannel,
      state.panels.applicationTicketMessageId,
      {
        embeds: [
          infoEmbed(
            "Apply For Zenoria",
            "Open an application ticket for staff, development, moderation, or partnership applications. Include the role you want, your experience, and examples of your work. Owners and managers will be pinged when the ticket opens."
          )
        ],
        components: [createApplicationTicketPanelRow()]
      }
    );
  }

  if (faqChannel?.isTextBased()) {
    panels.faqMessageId = await ensurePanelMessage(
      faqChannel,
      state.panels.faqMessageId,
      createFaqPanelPayload()
    );
  }

  return panels;
}

export async function setupChannelsOnly(guild, actor) {
  await guild.roles.fetch();
  await guild.channels.fetch();

  const roleResult = await ensureRoles(guild);
  await assignDefaultRoles(guild, roleResult.roleMap);
  const deprecatedCleanup = await deleteDeprecatedChannels(guild);

  if (deprecatedCleanup.deleted.length > 0) {
    await guild.channels.fetch();
  }

  const categoryIds = {};
  const channelIds = {};
  const createdCategories = [];
  const createdChannels = [];
  const updatedCategories = [];
  const updatedChannels = [];

  for (const categoryDefinition of categoryDefinitions) {
    const categoryResult = await ensureCategory(guild, roleResult.roleMap, categoryDefinition);
    categoryIds[definitionKey(categoryDefinition)] = categoryResult.category.id;

    if (categoryResult.created) createdCategories.push(categoryDefinition.name);
    else updatedCategories.push(categoryDefinition.name);

    for (const channelDefinition of categoryDefinition.channels) {
      const channelResult = await ensureChannel(
        guild,
        roleResult.roleMap,
        categoryResult.category,
        categoryDefinition,
        channelDefinition
      );

      channelIds[definitionKey(channelDefinition)] = channelResult.channel.id;

      if (channelResult.created) createdChannels.push(channelDefinition.name);
      else updatedChannels.push(channelDefinition.name);
    }
  }

  const ticketCategoryResult = await ensureCategory(guild, roleResult.roleMap, {
    key: "tickets",
    name: config.setup.ticketCategoryName,
    profile: "tickets"
  });
  categoryIds.tickets = ticketCategoryResult.category.id;

  if (ticketCategoryResult.created) createdCategories.push(config.setup.ticketCategoryName);
  else updatedCategories.push(config.setup.ticketCategoryName);

  const roleIds = Object.fromEntries(
    [...roleResult.roleMap.entries()].map(([roleName, role]) => [roleName, role.id])
  );

  const updatedState = await updateGuildState(guild.id, (guildState) => {
    guildState.roles = {
      ...guildState.roles,
      ...roleIds
    };
    guildState.categories = {
      ...guildState.categories,
      ...categoryIds
    };
    guildState.channels = {
      ...guildState.channels,
      ...channelIds
    };
  });

  const panelIds = await ensurePanels(guild, updatedState);

  await updateGuildState(guild.id, (guildState) => {
    guildState.panels = {
      ...guildState.panels,
      ...panelIds
    };
  });

  await sendLog(guild, {
    title: "Channels Setup Complete",
    description: `${actor.tag} synced the official ${config.brandName} channel layout without deleting channels.`,
    fields: [
      { name: "Categories Created", value: String(createdCategories.length), inline: true },
      { name: "Categories Synced", value: String(updatedCategories.length), inline: true },
      { name: "Channels Created", value: String(createdChannels.length), inline: true },
      { name: "Channels Synced", value: String(updatedChannels.length), inline: true },
      { name: "Deprecated Removed", value: String(deprecatedCleanup.deleted.length), inline: true }
    ],
    color: 0x2ecc71
  });

  return {
    embed: successEmbed(
      "Official Channels Setup Complete",
      "Existing channels were detected and synced. Missing official channels were added without deleting anything.",
      [
        { name: "Categories", value: `${createdCategories.length} created, ${updatedCategories.length} synced`, inline: true },
        { name: "Channels", value: `${createdChannels.length} created, ${updatedChannels.length} synced`, inline: true },
        { name: "Roles", value: `${roleResult.created.length} created, ${roleResult.updated.length} synced`, inline: true },
        { name: "Removed", value: `${deprecatedCleanup.deleted.length} deprecated channel(s)`, inline: true },
        { name: "Failed Removes", value: `${deprecatedCleanup.failed.length} channel(s)`, inline: true }
      ]
    )
  };
}

export async function syncChannelPermissionsOnly(guild, actor) {
  await guild.roles.fetch();
  await guild.channels.fetch();

  const roleResult = await ensureRoles(guild);
  const syncedCategories = [];
  const syncedChannels = [];
  const missingCategories = [];
  const missingChannels = [];

  for (const categoryDefinition of categoryDefinitions) {
    const category = findChannel(guild, categoryDefinition, ChannelType.GuildCategory);

    if (!category) {
      missingCategories.push(categoryDefinition.name);
      continue;
    }

    await category.permissionOverwrites.set(
      buildOverwrites(guild, roleResult.roleMap, categoryDefinition.profile),
      "Zenoria role permission sync"
    );
    syncedCategories.push(category.name);

    for (const channelDefinition of categoryDefinition.channels) {
      const channel = findChannel(guild, channelDefinition, channelDefinition.type ?? ChannelType.GuildText);

      if (!channel) {
        missingChannels.push(channelDefinition.name);
        continue;
      }

      const profile = channelDefinition.profile ?? categoryDefinition.profile;
      await channel.permissionOverwrites.set(
        buildOverwrites(guild, roleResult.roleMap, profile),
        "Zenoria role permission sync"
      );
      syncedChannels.push(channel.name);
    }
  }

  const ticketCategory = findChannel(
    guild,
    {
      key: "tickets",
      name: config.setup.ticketCategoryName,
      aliases: ["tickets", "🎫・tickets", "╭・🎫 tickets"]
    },
    ChannelType.GuildCategory
  );

  if (ticketCategory) {
    await ticketCategory.permissionOverwrites.set(
      buildOverwrites(guild, roleResult.roleMap, "tickets"),
      "Zenoria role permission sync"
    );
    syncedCategories.push(ticketCategory.name);
  } else {
    missingCategories.push(config.setup.ticketCategoryName);
  }

  await sendLog(guild, {
    title: "Role Permissions Synced",
    description: `${actor.tag} synced official channel permissions without creating or deleting channels.`,
    fields: [
      { name: "Categories Synced", value: String(syncedCategories.length), inline: true },
      { name: "Channels Synced", value: String(syncedChannels.length), inline: true },
      { name: "Missing Items", value: String(missingCategories.length + missingChannels.length), inline: true }
    ],
    color: 0x2ecc71
  });

  return {
    embed: successEmbed(
      "Role Permissions Synced",
      "Current official channel permissions were updated. Missing channels were not created by this command.",
      [
        { name: "Categories", value: `${syncedCategories.length} synced`, inline: true },
        { name: "Channels", value: `${syncedChannels.length} synced`, inline: true },
        { name: "Missing", value: `${missingCategories.length + missingChannels.length} not found`, inline: true }
      ]
    )
  };
}

export async function setupGuild(
  guild,
  actor,
  {
    force = false,
    wipeChannels = config.setup.wipeChannelsOnSetup,
    protectedChannelIds = config.setup.protectedChannelIds
  } = {}
) {
  const existingState = await getGuildState(guild.id);

  if (existingState.setup.completedAt && !force) {
    return {
      alreadySetup: true,
      embed: infoEmbed(
        "Setup Already Completed",
        `This server was already set up on ${new Date(existingState.setup.completedAt).toLocaleString()}. Use \`/setup force:true\` to resync missing roles, channels, and permissions.`
      )
    };
  }

  await guild.roles.fetch();
  await guild.channels.fetch();

  const channelReset = wipeChannels
    ? await deleteExistingChannels(guild, protectedChannelIds)
    : { deleted: [], failed: [], skipped: [], protectedCount: 0 };

  if (wipeChannels) {
    await guild.channels.fetch();
  }

  const roleResult = await ensureRoles(guild);
  const categoryIds = {};
  const channelIds = {};
  const createdCategories = [];
  const createdChannels = [];
  const updatedCategories = [];
  const updatedChannels = [];

  await assignDefaultRoles(guild, roleResult.roleMap);

  for (const categoryDefinition of categoryDefinitions) {
    const categoryResult = await ensureCategory(guild, roleResult.roleMap, categoryDefinition);
    categoryIds[definitionKey(categoryDefinition)] = categoryResult.category.id;

    if (categoryResult.created) createdCategories.push(categoryDefinition.name);
    else updatedCategories.push(categoryDefinition.name);

    for (const channelDefinition of categoryDefinition.channels) {
      const channelResult = await ensureChannel(
        guild,
        roleResult.roleMap,
        categoryResult.category,
        categoryDefinition,
        channelDefinition
      );

      channelIds[definitionKey(channelDefinition)] = channelResult.channel.id;

      if (channelResult.created) createdChannels.push(channelDefinition.name);
      else updatedChannels.push(channelDefinition.name);
    }
  }

  const ticketCategoryResult = await ensureCategory(guild, roleResult.roleMap, {
    name: config.setup.ticketCategoryName,
    profile: "tickets"
  });
  categoryIds.tickets = ticketCategoryResult.category.id;

  if (ticketCategoryResult.created) createdCategories.push(config.setup.ticketCategoryName);
  else updatedCategories.push(config.setup.ticketCategoryName);

  const roleIds = Object.fromEntries(
    [...roleResult.roleMap.entries()].map(([roleName, role]) => [roleName, role.id])
  );

  const updatedState = await updateGuildState(guild.id, (guildState) => {
    guildState.setup.completedAt = new Date().toISOString();
    guildState.setup.version = 1;
    guildState.roles = roleIds;
    guildState.categories = categoryIds;
    guildState.channels = channelIds;
    if (wipeChannels) {
      guildState.panels = {};
      guildState.tickets.openByUser = {};
    }
  });

  const panelIds = await ensurePanels(guild, updatedState);

  await updateGuildState(guild.id, (guildState) => {
    guildState.panels = {
      ...guildState.panels,
      ...panelIds
    };
  });

  await sendLog(guild, {
    title: "Server Setup Complete",
    description: `${actor.tag} completed the official ${config.brandName} server setup.`,
    fields: [
      { name: "Roles Created", value: String(roleResult.created.length), inline: true },
      { name: "Categories Created", value: String(createdCategories.length), inline: true },
      { name: "Channels Created", value: String(createdChannels.length), inline: true },
      { name: "Channels Deleted", value: String(channelReset.deleted.length), inline: true },
      { name: "Channels Protected", value: String(channelReset.protectedCount), inline: true }
    ],
    color: 0x2ecc71
  });

  return {
    alreadySetup: false,
    embed: successEmbed("Official Server Setup Complete", "Roles, permissions, categories, channels, verification, tickets, and logging are ready.", [
      { name: "Roles", value: `${roleResult.created.length} created, ${roleResult.updated.length} synced`, inline: true },
      { name: "Categories", value: `${createdCategories.length} created, ${updatedCategories.length} synced`, inline: true },
      { name: "Channels", value: `${createdChannels.length} created, ${updatedChannels.length} synced`, inline: true },
      { name: "Deleted", value: `${channelReset.deleted.length} old channel(s) removed`, inline: true },
      { name: "Protected", value: `${channelReset.protectedCount} channel(s) preserved`, inline: true },
      { name: "Skipped", value: `${channelReset.failed.length + channelReset.skipped.length} channel(s) could not be deleted`, inline: true }
    ])
  };
}
