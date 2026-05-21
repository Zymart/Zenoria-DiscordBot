import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { sendLog } from "../services/logger.js";
import { successEmbed } from "../utils/embeds.js";

export default {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to timeout.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription("Timeout duration in minutes.")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the timeout.")
        .setMaxLength(500)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser("user", true);
    const minutes = interaction.options.getInteger("minutes", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const member = await interaction.guild.members.fetch(user.id);

    if (!member.moderatable) {
      throw new Error("I cannot timeout that member. Check my role position and permissions.");
    }

    await member.timeout(minutes * 60 * 1000, `${interaction.user.tag}: ${reason}`);

    await sendLog(interaction.guild, {
      title: "Member Timed Out",
      description: `${user.tag} was timed out by ${interaction.user.tag}.`,
      fields: [
        { name: "Duration", value: `${minutes} minute(s)`, inline: true },
        { name: "Reason", value: reason.slice(0, 1024), inline: false }
      ],
      color: 0xf1c40f
    });

    await interaction.editReply({
      embeds: [successEmbed("Member Timed Out", `${user.tag} has been timed out for ${minutes} minute(s).`)]
    });
  }
};
