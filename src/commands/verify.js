import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { verifyMember } from "../services/verification.js";

export default {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verify yourself and unlock community access.")
    .setDMPermission(false),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const result = await verifyMember(interaction.guild, member);

    await interaction.editReply({ embeds: [result.embed] });
  }
};
