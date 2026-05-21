import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { sendLog } from "../services/logger.js";
import { successEmbed } from "../utils/embeds.js";

export default {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to kick.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the kick.")
        .setMaxLength(500)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const member = await interaction.guild.members.fetch(user.id);

    if (!member.kickable) {
      throw new Error("I cannot kick that member. Check my role position and permissions.");
    }

    await member.kick(`${interaction.user.tag}: ${reason}`);

    await sendLog(interaction.guild, {
      title: "Member Kicked",
      description: `${user.tag} was kicked by ${interaction.user.tag}.`,
      fields: [{ name: "Reason", value: reason.slice(0, 1024) }],
      color: 0xe67e22
    });

    await interaction.editReply({
      embeds: [successEmbed("Member Kicked", `${user.tag} has been kicked.`)]
    });
  }
};
