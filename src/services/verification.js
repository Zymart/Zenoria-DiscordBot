import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { config } from "../config.js";
import { getGuildState } from "../data/store.js";
import { createEmbed, successEmbed } from "../utils/embeds.js";
import { sendLog } from "./logger.js";

export function createVerificationRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("verify:member")
      .setLabel("Verify")
      .setStyle(ButtonStyle.Success)
  );
}

async function findWelcomeChannel(guild) {
  const state = await getGuildState(guild.id);
  const configuredId =
    state.channels?.[config.setup.welcomeChannelKey] ??
    state.channels?.[config.setup.welcomeChannelName];

  return (
    (configuredId &&
      (guild.channels.cache.get(configuredId) ??
        await guild.channels.fetch(configuredId).catch(() => null))) ??
    guild.channels.cache.find((channel) =>
      channel.name === config.setup.welcomeChannelName ||
      channel.name === config.setup.welcomeChannelKey ||
      channel.name.endsWith("welcome")
    )
  );
}

async function sendVerifiedWelcome(guild, member) {
  const channel = await findWelcomeChannel(guild);

  if (!channel?.isTextBased()) return;

  await channel.send({
    content: `${member}`,
    embeds: [
      createEmbed({
        title: "Member Verified",
        description: `${member} has joined the official ${config.brandName} community.`,
        color: 0x57f287,
        thumbnail: member.user.displayAvatarURL({ size: 256 }),
        fields: [
          { name: "User", value: member.user.tag, inline: true },
          { name: "Member Count", value: String(guild.memberCount), inline: true }
        ]
      })
    ]
  }).catch(() => null);
}

export async function verifyMember(guild, member) {
  const rolesToAdd = [
    guild.roles.cache.find((role) => role.name === config.setup.verifiedRoleName),
    guild.roles.cache.find((role) => role.name === config.setup.memberRoleName)
  ].filter(Boolean);

  if (rolesToAdd.length === 0) {
    throw new Error("The verification roles do not exist yet. Run /setup first.");
  }

  const missingRoles = rolesToAdd.filter((role) => !member.roles.cache.has(role.id));

  if (missingRoles.length === 0) {
    return {
      alreadyVerified: true,
      embed: successEmbed("Already Verified", "You already have access to the server.")
    };
  }

  await member.roles.add(missingRoles, "Member verified through Zenoria bot");
  await sendVerifiedWelcome(guild, member);

  await sendLog(guild, {
    title: "Member Verified",
    description: `${member.user.tag} verified and received community access.`,
    fields: [{ name: "Member", value: `${member}`, inline: true }],
    color: 0x57f287
  });

  return {
    alreadyVerified: false,
    embed: successEmbed("Verified", "You now have access to the Zenoria community.")
  };
}
