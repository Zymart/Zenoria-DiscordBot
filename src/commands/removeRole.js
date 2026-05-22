import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { sendLog } from "../services/logger.js";
import { assertManageableRole } from "../services/roleActions.js";
import { successEmbed } from "../utils/embeds.js";

export default {
  data: new SlashCommandBuilder()
    .setName("remove_role")
    .setDescription("Remove a role from a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to remove the role from.")
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("The role to remove.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for removing the role.")
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

    await assertManageableRole(interaction.guild, actorMember, role, "remove");

    if (!targetMember.roles.cache.has(role.id)) {
      throw new Error(`${user.tag} does not have ${role.name}.`);
    }

    await targetMember.roles.remove(role, `${interaction.user.tag}: ${reason}`);

    await sendLog(interaction.guild, {
      title: "Role Removed",
      description: `${interaction.user.tag} removed ${role} from ${user.tag}.`,
      fields: [{ name: "Reason", value: reason.slice(0, 1024) }],
      color: 0xe67e22
    });

    await interaction.editReply({
      embeds: [successEmbed("Role Removed", `Removed ${role} from ${targetMember}.`)]
    });
  }
};
