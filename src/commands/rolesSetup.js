import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { setupRolesOnly } from "../services/roleSetup.js";

export default {
  data: new SlashCommandBuilder()
    .setName("roles_setup")
    .setDescription("Clean non-official roles and add missing official Zenoria roles.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addBooleanOption((option) =>
      option
        .setName("clean")
        .setDescription("Delete non-official manageable roles first. Defaults to true.")
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const clean = interaction.options.getBoolean("clean") ?? true;
    const result = await setupRolesOnly(interaction.guild, interaction.user, { clean });

    await interaction.editReply({ embeds: [result.embed] });
  }
};
