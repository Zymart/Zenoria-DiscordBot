import { Events } from "discord.js";
import { config } from "../config.js";
import { getGuildState } from "../data/store.js";
import { createEmbed } from "../utils/embeds.js";

export function registerGuildMemberAdd(client) {
  client.on(Events.GuildMemberAdd, async (member) => {
    const state = await getGuildState(member.guild.id);
    const welcomeChannelId =
      state.channels?.[config.setup.welcomeChannelKey] ??
      state.channels?.[config.setup.welcomeChannelName];
    const channel =
      (welcomeChannelId && member.guild.channels.cache.get(welcomeChannelId)) ??
      member.guild.channels.cache.find((candidate) =>
        candidate.name === config.setup.welcomeChannelName ||
        candidate.name === config.setup.welcomeChannelKey
      );

    if (!channel?.isTextBased()) return;

    await channel.send({
      content: `${member}`,
      embeds: [
        createEmbed({
          title: `Welcome to ${config.brandName}`,
          description: `Welcome to the official ${config.brandName} Roblox community. Use /verify or the verification button in the verify channel to unlock the server.`,
          thumbnail: member.user.displayAvatarURL({ size: 256 }),
          fields: [{ name: "Member Count", value: String(member.guild.memberCount), inline: true }]
        })
      ]
    }).catch(() => null);
  });
}
