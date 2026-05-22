import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { sendLog } from "../services/logger.js";
import { cleanUnverifiedDeveloperRoles } from "../services/roleActions.js";
import { successEmbed } from "../utils/embeds.js";

function summarizeUpdates(updates) {
  if (updates.length === 0) return "None";

  return updates
    .slice(0, 10)
    .map(({ member, roles }) => `${member.user.tag}: ${roles.join(", ")}`)
    .join("\n");
}

export default {
  data: new SlashCommandBuilder()
    .setName("clean_unverified_devs")
    .setDescription("Remove developer roles from members who are not verified.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for removing the roles.")
        .setMaxLength(500)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const actorMember = await interaction.guild.members.fetch(interaction.user.id);
    const reason =
      interaction.options.getString("reason") ??
      `${interaction.user.tag}: cleaned developer roles from unverified members`;
    const result = await cleanUnverifiedDeveloperRoles(interaction.guild, actorMember, reason);

    await sendLog(interaction.guild, {
      title: "Unverified Developer Roles Cleaned",
      description: `${interaction.user.tag} removed developer roles from ${result.updated.length} unverified member(s).`,
      fields: [
        { name: "Checked Members", value: String(result.checkedMembers), inline: true },
        { name: "Updated", value: String(result.updated.length), inline: true },
        { name: "Failed", value: String(result.failed.length), inline: true },
        { name: "Roles Skipped", value: result.skippedRoles.join(", ") || "None", inline: false }
      ],
      color: 0xe67e22
    });

    await interaction.editReply({
      embeds: [
        successEmbed("Cleaned Unverified Developers", "Developer roles were removed from unverified members.", [
          { name: "Checked", value: String(result.checkedMembers), inline: true },
          { name: "Updated", value: String(result.updated.length), inline: true },
          { name: "Failed", value: String(result.failed.length), inline: true },
          { name: "Updated Members", value: summarizeUpdates(result.updated).slice(0, 1024), inline: false }
        ])
      ]
    });
  }
};
