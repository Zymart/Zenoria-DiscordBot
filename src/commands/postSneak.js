import { ChannelType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { postSneak } from "../services/posts.js";

export default {
  data: new SlashCommandBuilder()
    .setName("post_sneak")
    .setDescription("Post a spoilered Zenoria sneak peek file.")
    .setDMPermission(false)
    .addAttachmentOption((option) =>
      option
        .setName("file")
        .setDescription("File to post as a spoiler.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("caption")
        .setDescription("Optional sneak peek caption.")
        .setMaxLength(1000)
        .setRequired(false)
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
        .setDescription("Where to post it. Defaults to the sneak-peeks channel.")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await postSneak(interaction, {
      file: interaction.options.getAttachment("file") ?? interaction.options.getAttachment("image", true),
      caption: interaction.options.getString("caption") ?? undefined,
      title: interaction.options.getString("title") ?? undefined,
      channel: interaction.options.getChannel("channel") ?? undefined
    });

    await interaction.editReply({ embeds: [result.embed] });
  }
};
