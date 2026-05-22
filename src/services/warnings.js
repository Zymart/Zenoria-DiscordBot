import { getGuildState, updateGuildState } from "../data/store.js";

export async function createWarning(guild, moderator, member, reason) {
  return updateGuildState(guild.id, (guildState) => {
    guildState.warnings.counter += 1;
    guildState.warnings.byUser[member.id] ??= [];

    const warning = {
      id: String(guildState.warnings.counter),
      userId: member.id,
      userTag: member.user.tag,
      moderatorId: moderator.id,
      moderatorTag: moderator.tag,
      reason,
      createdAt: new Date().toISOString()
    };

    guildState.warnings.byUser[member.id].push(warning);
    return warning;
  });
}

export async function getWarnings(guildId, userId) {
  const state = await getGuildState(guildId);
  return state.warnings.byUser[userId] ?? [];
}
