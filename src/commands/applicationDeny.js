import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { denyApplication } from "../services/applications.js";

export default {
  data: new SlashCommandBuilder()
    .setName("application_deny")
    .setDescription("Deny an application ticket and close it.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for denying the application.")
        .setMaxLength(1000)
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Applicant. Defaults to the ticket owner.")
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await denyApplication(interaction, {
      user: interaction.options.getUser("user") ?? undefined,
      reason: interaction.options.getString("reason", true)
    });

    await interaction.editReply({
      embeds: [result.embed]
    });
  }
};
