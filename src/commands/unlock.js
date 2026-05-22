import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { sendLog } from "../services/logger.js";
import { successEmbed } from "../utils/embeds.js";

const unlockPermissions = {
  SendMessages: null,
  SendMessagesInThreads: null,
  CreatePublicThreads: null,
  CreatePrivateThreads: null
};

export default {
  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock a channel by clearing the lock permissions.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to unlock. Defaults to this channel.")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for unlocking the channel.")
        .setMaxLength(500)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.options.getChannel("channel") ?? interaction.channel;
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    await channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      unlockPermissions,
      { reason: `${interaction.user.tag}: ${reason}` }
    );

    await sendLog(interaction.guild, {
      title: "Channel Unlocked",
      description: `${interaction.user.tag} unlocked ${channel}.`,
      fields: [{ name: "Reason", value: reason.slice(0, 1024) }],
      color: 0x2ecc71
    });

    await interaction.editReply({
      embeds: [successEmbed("Channel Unlocked", `${channel} is now unlocked.`)]
    });
  }
};
