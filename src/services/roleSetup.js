import { roleDefinitions } from "../data/serverTemplate.js";
import { updateGuildState } from "../data/store.js";
import { successEmbed } from "../utils/embeds.js";
import { sendLog } from "./logger.js";
import { ensureRoles } from "./setupServer.js";

const officialRoleNames = new Set(roleDefinitions.map((role) => role.name));

function canDeleteRole(role, botMember) {
  if (role.managed) return false;
  if (role.id === role.guild.roles.everyone.id) return false;
  if (botMember.roles.cache.has(role.id)) return false;
  if (role.position >= botMember.roles.highest.position) return false;

  return role.editable;
}

async function deleteManageableRoles(guild) {
  const botMember = guild.members.me ?? await guild.members.fetchMe();
  const roles = [...guild.roles.cache.values()]
    .filter((role) => canDeleteRole(role, botMember))
    .filter((role) => !officialRoleNames.has(role.name))
    .sort((left, right) => left.position - right.position);
  const deleted = [];
  const failed = [];
  const skipped = [...guild.roles.cache.values()].filter(
    (role) =>
      role.id !== guild.roles.everyone.id &&
      !role.managed &&
      !botMember.roles.cache.has(role.id) &&
      !officialRoleNames.has(role.name) &&
      role.position >= botMember.roles.highest.position
  );

  for (const role of roles) {
    try {
      await role.delete("Zenoria role cleanup before official role setup");
      deleted.push(role.name);
    } catch (error) {
      failed.push(`${role.name}: ${error.message}`);
    }
  }

  return {
    deleted,
    failed,
    skippedHigherOrEqual: skipped.map((role) => role.name)
  };
}

export async function setupRolesOnly(guild, actor, { clean = true } = {}) {
  await guild.roles.fetch();
  await guild.members.fetchMe();

  const cleanup = clean
    ? await deleteManageableRoles(guild)
    : { deleted: [], failed: [], skippedHigherOrEqual: [] };

  await guild.roles.fetch();

  const roleResult = await ensureRoles(guild);
  const roleIds = Object.fromEntries(
    [...roleResult.roleMap.entries()].map(([roleName, role]) => [roleName, role.id])
  );

  await updateGuildState(guild.id, (guildState) => {
    guildState.roles = roleIds;
  });

  await sendLog(guild, {
    title: "Roles Setup Complete",
    description: `${actor.tag} cleaned non-official roles and synced the official Zenoria role hierarchy.`,
    fields: [
      { name: "Deleted", value: String(cleanup.deleted.length), inline: true },
      { name: "Created", value: String(roleResult.created.length), inline: true },
      { name: "Synced", value: String(roleResult.updated.length), inline: true },
      { name: "Existing Higher Official", value: String(roleResult.skipped.length), inline: true },
      { name: "Skipped Higher Roles", value: String(cleanup.skippedHigherOrEqual.length), inline: true },
      { name: "Failed Deletes", value: String(cleanup.failed.length), inline: true }
    ],
    color: 0x2ecc71
  });

  return {
    cleanup,
    roleResult,
    embed: successEmbed(
      "Official Roles Setup Complete",
      "Non-official roles below the bot were cleaned up. Existing official roles were detected, synced when possible, and missing official roles were added.",
      [
        { name: "Deleted", value: `${cleanup.deleted.length} role(s) removed`, inline: true },
        { name: "Created", value: `${roleResult.created.length} official role(s) created`, inline: true },
        { name: "Synced", value: `${roleResult.updated.length} official role(s) synced`, inline: true },
        { name: "Official Skipped", value: `${roleResult.skipped.length} existing official role(s) above the bot`, inline: true },
        { name: "Other Skipped", value: `${cleanup.skippedHigherOrEqual.length} higher/equal non-official role(s) preserved`, inline: true },
        { name: "Failed", value: `${cleanup.failed.length} role(s) could not be deleted`, inline: true },
        { name: "Official Roles", value: `${officialRoleNames.size} total`, inline: true }
      ]
    )
  };
}
