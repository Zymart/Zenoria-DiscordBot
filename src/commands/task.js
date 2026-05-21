import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createTaskThread, taskRoleChoices } from "../services/tasks.js";

export default {
  data: new SlashCommandBuilder()
    .setName("task")
    .setDescription("Create a development task thread for a specialty role.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("role")
        .setDescription("Which team should work on this task?")
        .setRequired(true)
        .addChoices(...taskRoleChoices)
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Short task title.")
        .setMaxLength(100)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("details")
        .setDescription("What needs to be done?")
        .setMaxLength(2000)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("due")
        .setDescription("Optional due date or deadline text.")
        .setMaxLength(100)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await createTaskThread(interaction.guild, interaction.user, {
      roleName: interaction.options.getString("role", true),
      title: interaction.options.getString("title", true),
      details: interaction.options.getString("details", true),
      due: interaction.options.getString("due") ?? undefined
    });

    await interaction.editReply({ embeds: [result.embed] });
  }
};
