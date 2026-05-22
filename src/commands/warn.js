import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { sendLog } from "../services/logger.js";
import { createWarning } from "../services/warnings.js";
import { successEmbed } from "../utils/embeds.js";

export default {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member and save it in bot state.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to warn.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the warning.")
        .setMaxLength(1000)
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    const member = await interaction.guild.members.fetch(user.id);
    const warning = await createWarning(interaction.guild, interaction.user, member, reason);

    await member.send({
      embeds: [
        successEmbed("Warning Received", `You were warned in ${interaction.guild.name}.`, [
          { name: "Reason", value: reason.slice(0, 1024), inline: false }
        ])
      ]
    }).catch(() => null);

    await sendLog(interaction.guild, {
      title: "Member Warned",
      description: `${user.tag} was warned by ${interaction.user.tag}.`,
      fields: [
        { name: "Warning ID", value: warning.id, inline: true },
        { name: "Reason", value: reason.slice(0, 1024), inline: false }
      ],
      color: 0xf1c40f
    });

    await interaction.editReply({
      embeds: [
        successEmbed("Member Warned", `${member} has been warned.`, [
          { name: "Warning ID", value: warning.id, inline: true }
        ])
      ]
    });
  }
};
