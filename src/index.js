import { Client, GatewayIntentBits, Partials } from "discord.js";
import { config, requireRuntimeConfig } from "./config.js";
import { registerGuildMemberAdd } from "./events/guildMemberAdd.js";
import { registerInteractionCreate } from "./events/interactionCreate.js";
import { registerReady } from "./events/ready.js";
import { startHealthServer } from "./healthServer.js";
import { createCommandCollection } from "./registry.js";

requireRuntimeConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.User]
});

client.commands = createCommandCollection();

registerReady(client);
registerInteractionCreate(client);
registerGuildMemberAdd(client);
startHealthServer(client);

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

await client.login(config.token);
