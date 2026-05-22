import { PermissionFlagsBits } from "discord.js";
import { roleGroups } from "../data/serverTemplate.js";

export function canManageRole(member, role) {
  if (member.id === member.guild.ownerId) return true;

  return role.position < member.roles.highest.position;
}

export async function assertManageableRole(guild, actorMember, role, action = "manage") {
  const botMember = guild.members.me ?? await guild.members.fetchMe();

  if (role.id === guild.roles.everyone.id) {
    throw new Error("You cannot manage the @everyone role.");
  }

  if (role.managed) {
    throw new Error("I cannot manage integration or bot-managed roles.");
  }

  if (!role.editable || role.position >= botMember.roles.highest.position) {
    throw new Error(`I cannot ${action} that role. Move my bot role above it first.`);
  }

  if (!canManageRole(actorMember, role)) {
    throw new Error("You can only manage roles below your highest role.");
  }
}

export async function cleanUnverifiedDeveloperRoles(guild, actorMember, reason) {
  await guild.roles.fetch();
  const members = await guild.members.fetch();
  const verifiedRole = guild.roles.cache.find((role) => role.name === "Verified");

  if (!verifiedRole) {
    throw new Error("The Verified role does not exist.");
  }

  const devRoles = roleGroups.development
    .map((roleName) => guild.roles.cache.find((role) => role.name === roleName))
    .filter(Boolean);

  const removableDevRoles = [];
  const skippedRoles = [];

  for (const role of devRoles) {
    try {
      await assertManageableRole(guild, actorMember, role, "remove");
      removableDevRoles.push(role);
    } catch {
      skippedRoles.push(role.name);
    }
  }

  if (removableDevRoles.length === 0) {
    throw new Error("No developer roles are manageable by both you and the bot.");
  }

  const updated = [];
  const failed = [];

  for (const member of members.values()) {
    if (member.user.bot || member.roles.cache.has(verifiedRole.id)) continue;

    const rolesToRemove = removableDevRoles.filter((role) => member.roles.cache.has(role.id));
    if (rolesToRemove.length === 0) continue;

    try {
      await member.roles.remove(rolesToRemove, reason);
      updated.push({
        member,
        roles: rolesToRemove.map((role) => role.name)
      });
    } catch (error) {
      failed.push({
        member,
        roles: rolesToRemove.map((role) => role.name),
        error: error.message
      });
    }
  }

  return {
    checkedMembers: members.size,
    developerRoles: devRoles.map((role) => role.name),
    skippedRoles,
    updated,
    failed
  };
}
