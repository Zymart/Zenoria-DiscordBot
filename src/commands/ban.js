import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { successEmbed } from "../utils/embeds.js";
import { sendLog } from "../services/logger.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to ban.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the ban.")
        .setMaxLength(500)
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("delete_message_days")
        .setDescription("Days of messages to delete, from 0 to 7.")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const deleteDays = interaction.options.getInteger("delete_message_days") ?? 0;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member && !member.bannable) {
      throw new Error("I cannot ban that member. Check my role position and permissions.");
    }

    await interaction.guild.members.ban(user.id, {
      deleteMessageSeconds: deleteDays * 24 * 60 * 60,
      reason: `${interaction.user.tag}: ${reason}`
    });

    await sendLog(interaction.guild, {
      title: "Member Banned",
      description: `${user.tag} was banned by ${interaction.user.tag}.`,
      fields: [{ name: "Reason", value: reason.slice(0, 1024) }],
      color: 0xe74c3c
    });

    await interaction.editReply({
      embeds: [successEmbed("Member Banned", `${user.tag} has been banned.`)]
    });
  }
};
