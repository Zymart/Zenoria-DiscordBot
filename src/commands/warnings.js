import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { getWarnings } from "../services/warnings.js";
import { infoEmbed } from "../utils/embeds.js";

function formatWarnings(warnings) {
  if (warnings.length === 0) return "No warnings found.";

  return warnings
    .slice(-10)
    .reverse()
    .map((warning) => {
      const date = new Date(warning.createdAt).toLocaleString();
      return `#${warning.id} - ${date}\nBy: ${warning.moderatorTag}\nReason: ${warning.reason}`;
    })
    .join("\n\n")
    .slice(0, 4000);
}

export default {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View saved warnings for a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to check.")
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser("user", true);
    const warnings = await getWarnings(interaction.guild.id, user.id);

    await interaction.editReply({
      embeds: [
        infoEmbed(`Warnings For ${user.tag}`, formatWarnings(warnings), [
          { name: "Total", value: String(warnings.length), inline: true }
        ])
      ]
    });
  }
};
