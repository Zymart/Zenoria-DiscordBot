import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { config } from "../config.js";
import { setupGuild } from "../services/setupServer.js";

export default {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Create the official Roblox game server structure.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addBooleanOption((option) =>
      option
        .setName("force")
        .setDescription("Resync roles, channels, permissions, and panels if setup already ran.")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("wipe_channels")
        .setDescription("Delete existing channels first, except protected channels. Defaults to true.")
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const force = interaction.options.getBoolean("force") ?? false;
    const wipeChannels =
      interaction.options.getBoolean("wipe_channels") ?? config.setup.wipeChannelsOnSetup;
    const result = await setupGuild(interaction.guild, interaction.user, {
      force,
      wipeChannels
    });

    await interaction.editReply({ embeds: [result.embed] });
  }
};
