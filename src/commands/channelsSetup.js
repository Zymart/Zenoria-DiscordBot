import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { setupChannelsOnly } from "../services/setupServer.js";

export default {
  data: new SlashCommandBuilder()
    .setName("channels_setup")
    .setDescription("Add missing official channels and sync existing channels without deleting anything.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await setupChannelsOnly(interaction.guild, interaction.user);

    await interaction.editReply({ embeds: [result.embed] });
  }
};
