import { config } from "../config.js";
import { getGuildState } from "../data/store.js";
import { createEmbed } from "../utils/embeds.js";

export async function sendLog(guild, { title, description, fields = [], color }) {
  if (!guild) return;

  const state = await getGuildState(guild.id);
  const configuredId =
    state.channels?.[config.setup.logChannelKey] ??
    state.channels?.[config.setup.logChannelName] ??
    state.channels?.["ban-logs"] ??
    state.channels?.ban_logs;
  const channel =
    (configuredId && (guild.channels.cache.get(configuredId) ?? await guild.channels.fetch(configuredId).catch(() => null))) ??
    guild.channels.cache.find((candidate) =>
      candidate.name === config.setup.logChannelName ||
      candidate.name === config.setup.logChannelKey ||
      candidate.name === "ban-logs" ||
      candidate.name === "ban_logs" ||
      candidate.name === "🧾・ban-logs" ||
      candidate.name === "🧾・ban_logs"
    );

  if (!channel?.isTextBased()) return;

  await channel.send({
    embeds: [
      createEmbed({
        title,
        description,
        fields,
        color
      })
    ]
  }).catch(() => null);
}
