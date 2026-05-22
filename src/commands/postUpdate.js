import { ChannelType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { postUpdate } from "../services/posts.js";

export default {
  data: new SlashCommandBuilder()
    .setName("post_update")
    .setDescription("Post an official Zenoria update.")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("update")
        .setDescription("What changed?")
        .setMaxLength(2000)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Optional embed title.")
        .setMaxLength(100)
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Where to post it. Defaults to the updates channel.")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await postUpdate(interaction, {
      update: interaction.options.getString("update", true),
      title: interaction.options.getString("title") ?? undefined,
      channel: interaction.options.getChannel("channel") ?? undefined
    });

    await interaction.editReply({ embeds: [result.embed] });
  }
};
