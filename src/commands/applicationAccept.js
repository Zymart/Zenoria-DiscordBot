import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { acceptApplication } from "../services/applications.js";

export default {
  data: new SlashCommandBuilder()
    .setName("application_accept")
    .setDescription("Accept an application ticket, add a role, and close the ticket.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role to give the accepted applicant.")
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Applicant. Defaults to the ticket owner.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason or note for accepting the application.")
        .setMaxLength(500)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await acceptApplication(interaction, {
      role: interaction.options.getRole("role", true),
      user: interaction.options.getUser("user") ?? undefined,
      reason: interaction.options.getString("reason") ?? "Application accepted"
    });

    await interaction.editReply({
      embeds: [result.embed]
    });
  }
};
