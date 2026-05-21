import { config } from "../config.js";
import { getGuildState } from "../data/store.js";
import { infoEmbed, successEmbed } from "../utils/embeds.js";
import { sendLog } from "./logger.js";

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function findVerifyChannel(guild) {
  const state = await getGuildState(guild.id);
  const configuredId =
    state.channels?.[config.setup.verifyChannelKey] ??
    state.channels?.[config.setup.verifyChannelName];

  return (
    (configuredId &&
      (guild.channels.cache.get(configuredId) ??
        await guild.channels.fetch(configuredId).catch(() => null))) ??
    guild.channels.cache.find((channel) =>
      channel.name === config.setup.verifyChannelName ||
      channel.name === config.setup.verifyChannelKey ||
      channel.name.endsWith("verify")
    )
  );
}

function buildVerifyLink(guild, verifyChannel) {
  if (!verifyChannel) return null;

  return `https://discord.com/channels/${guild.id}/${verifyChannel.id}`;
}

export async function pingUnverifiedMembers(guild, actor, { limit = 100, customMessage } = {}) {
  await guild.roles.fetch();
  await guild.channels.fetch();

  const verifiedRole = guild.roles.cache.find((role) => role.name === config.setup.verifiedRoleName);

  if (!verifiedRole) {
    throw new Error(`The ${config.setup.verifiedRoleName} role does not exist yet. Run /role_setup first.`);
  }

  const verifyChannel = await findVerifyChannel(guild);
  const verifyLink = buildVerifyLink(guild, verifyChannel);
  const members = await guild.members.fetch();
  const unverifiedMembers = members
    .filter((member) => !member.user.bot)
    .filter((member) => !member.roles.cache.has(verifiedRole.id))
    .first(limit);
  const sent = [];
  const failed = [];

  for (const member of unverifiedMembers) {
    try {
      await member.send({
        embeds: [
          infoEmbed(
            `Verify in ${config.brandName}`,
            customMessage ??
              `You are still not verified in the official ${config.brandName} server. Please open the verify channel and press the verify button.${verifyLink ? `\n\nVerify here: ${verifyLink}` : ""}`
          )
        ]
      });
      sent.push(member.user.tag);
    } catch (error) {
      failed.push(`${member.user.tag}: ${error.message}`);
    }

    await sleep(750);
  }

  await sendLog(guild, {
    title: "Unverified Members Pinged",
    description: `${actor.tag} sent verification reminders by DM.`,
    fields: [
      { name: "Found", value: String(unverifiedMembers.length), inline: true },
      { name: "Sent", value: String(sent.length), inline: true },
      { name: "Failed", value: String(failed.length), inline: true }
    ],
    color: 0x3498db
  });

  return {
    found: unverifiedMembers.length,
    sent: sent.length,
    failed: failed.length,
    embed: successEmbed(
      "Verification DMs Sent",
      "I pinged unverified members by DM. Some users may block server DMs, so failed sends are normal.",
      [
        { name: "Found", value: `${unverifiedMembers.length} unverified`, inline: true },
        { name: "Sent", value: `${sent.length} DM(s)`, inline: true },
        { name: "Failed", value: `${failed.length} DM(s)`, inline: true }
      ]
    )
  };
}
