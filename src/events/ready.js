import { ActivityType, Events } from "discord.js";
import { config } from "../config.js";
import { deployCommands } from "../services/commandDeployment.js";

export function registerReady(client) {
  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);

    readyClient.user.setActivity(`${config.brandName} official server`, {
      type: ActivityType.Watching
    });

    if (!config.autoDeployCommands) return;

    try {
      const result = await deployCommands();
      console.log(`Deployed ${result.count} slash commands to ${result.scope}`);
    } catch (error) {
      console.error("Automatic slash command deployment failed:", error);
    }
  });
}
