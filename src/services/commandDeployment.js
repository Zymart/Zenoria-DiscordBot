import { REST, Routes } from "discord.js";
import { config, requireRuntimeConfig } from "../config.js";
import { commandPayloads } from "../registry.js";

export async function deployCommands() {
  requireRuntimeConfig({ deploy: true });

  const rest = new REST({ version: "10" }).setToken(config.token);
  const body = commandPayloads();
  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  await rest.put(route, { body });

  return {
    count: body.length,
    scope: config.guildId ? `guild ${config.guildId}` : "global"
  };
}
