import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { sendLog } from "../services/logger.js";
import { successEmbed } from "../utils/embeds.js";

function canManageRole(member, role) {
  if (member.id === member.guild.ownerId) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  return role.position < member.roles.highest.position;
}

export default {
  data: new SlashCommandBuilder()
    .setName("add_role")
    .setDescription("Add a role to a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to receive the role.")
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("The role to add.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for adding the role.")
        .setMaxLength(500)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser("user", true);
    const role = interaction.options.getRole("role", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const targetMember = await interaction.guild.members.fetch(user.id);
    const actorMember = await interaction.guild.members.fetch(interaction.user.id);
    const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetchMe();

    if (role.id === interaction.guild.roles.everyone.id) {
      throw new Error("You cannot add the @everyone role.");
    }

    if (role.managed) {
      throw new Error("I cannot add managed integration or bot roles.");
    }

    if (!role.editable || role.position >= botMember.roles.highest.position) {
      throw new Error("I cannot add that role. Move my bot role above it first.");
    }

    if (!canManageRole(actorMember, role)) {
      throw new Error("You can only add roles below your highest role.");
    }

    if (targetMember.roles.cache.has(role.id)) {
      throw new Error(`${user.tag} already has ${role.name}.`);
    }

    await targetMember.roles.add(role, `${interaction.user.tag}: ${reason}`);

    await sendLog(interaction.guild, {
      title: "Role Added",
      description: `${interaction.user.tag} added ${role} to ${user.tag}.`,
      fields: [{ name: "Reason", value: reason.slice(0, 1024) }],
      color: 0x2ecc71
    });

    await interaction.editReply({
      embeds: [successEmbed("Role Added", `Added ${role} to ${targetMember}.`)]
    });
  }
};
