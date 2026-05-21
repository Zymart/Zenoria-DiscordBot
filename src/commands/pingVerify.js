import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { pingUnverifiedMembers } from "../services/pingVerify.js";

export default {
  data: new SlashCommandBuilder()
    .setName("pingverify")
    .setDescription("DM members who are still not verified.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("Maximum number of unverified members to DM. Defaults to 100.")
        .setMinValue(1)
        .setMaxValue(500)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Optional custom DM message.")
        .setMaxLength(1000)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const limit = interaction.options.getInteger("limit") ?? 100;
    const customMessage = interaction.options.getString("message") ?? undefined;
    const result = await pingUnverifiedMembers(interaction.guild, interaction.user, {
      limit,
      customMessage
    });

    await interaction.editReply({ embeds: [result.embed] });
  }
};
