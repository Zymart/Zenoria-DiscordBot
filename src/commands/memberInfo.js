import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { infoEmbed } from "../utils/embeds.js";

function discordTimestamp(date, style = "F") {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

function formatRoles(member) {
  const roles = member.roles.cache
    .filter((role) => role.id !== member.guild.roles.everyone.id)
    .sort((left, right) => right.position - left.position)
    .map((role) => `${role}`);

  if (roles.length === 0) return "None";

  return roles.slice(0, 15).join(", ").slice(0, 1024);
}

export default {
  data: new SlashCommandBuilder()
    .setName("member_info")
    .setDescription("Show useful information about a server member.")
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Member to inspect. Defaults to you.")
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser("user") ?? interaction.user;
    const member = await interaction.guild.members.fetch(user.id);
    const verified = member.roles.cache.some((role) => role.name === "Verified");

    await interaction.editReply({
      embeds: [
        infoEmbed(`Member Info: ${user.tag}`, `Details for ${member}.`, [
          { name: "User ID", value: user.id, inline: true },
          { name: "Bot", value: user.bot ? "Yes" : "No", inline: true },
          { name: "Verified", value: verified ? "Yes" : "No", inline: true },
          { name: "Account Created", value: discordTimestamp(user.createdAt), inline: false },
          { name: "Joined Server", value: member.joinedAt ? discordTimestamp(member.joinedAt) : "Unknown", inline: false },
          { name: "Highest Role", value: `${member.roles.highest}`, inline: true },
          { name: "Role Count", value: String(Math.max(member.roles.cache.size - 1, 0)), inline: true },
          { name: "Roles", value: formatRoles(member), inline: false }
        ]).setThumbnail(user.displayAvatarURL({ size: 256 }))
      ]
    });
  }
};
