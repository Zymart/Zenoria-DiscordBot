import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { sendLog } from "../services/logger.js";
import { successEmbed } from "../utils/embeds.js";

const lockPermissions = {
  SendMessages: false,
  SendMessagesInThreads: false,
  CreatePublicThreads: false,
  CreatePrivateThreads: false
};

export default {
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock a channel so regular members cannot send messages.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to lock. Defaults to this channel.")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for locking the channel.")
        .setMaxLength(500)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.options.getChannel("channel") ?? interaction.channel;
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    await channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      lockPermissions,
      { reason: `${interaction.user.tag}: ${reason}` }
    );

    await sendLog(interaction.guild, {
      title: "Channel Locked",
      description: `${interaction.user.tag} locked ${channel}.`,
      fields: [{ name: "Reason", value: reason.slice(0, 1024) }],
      color: 0xe67e22
    });

    await interaction.editReply({
      embeds: [successEmbed("Channel Locked", `${channel} is now locked.`)]
    });
  }
};
