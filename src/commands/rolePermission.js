import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { syncChannelPermissionsOnly } from "../services/setupServer.js";

export default {
  data: new SlashCommandBuilder()
    .setName("role_permission")
    .setDescription("Sync official channel permission overwrites without creating or deleting channels.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await syncChannelPermissionsOnly(interaction.guild, interaction.user);

    await interaction.editReply({ embeds: [result.embed] });
  }
};
