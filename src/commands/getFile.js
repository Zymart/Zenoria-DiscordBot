import { AttachmentBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { downloadStorageFile } from "../services/storage.js";

function clipContent(value) {
  const text = String(value ?? "");
  return text.length > 1800 ? `${text.slice(0, 1797)}...` : text;
}

export default {
  data: new SlashCommandBuilder()
    .setName("get")
    .setDescription("Send a saved Supabase Storage file.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("filename")
        .setDescription("Copy name from /savedlist.")
        .setMaxLength(1000)
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const downloadedFile = await downloadStorageFile(
      interaction.options.getString("filename", true),
      { guildId: interaction.guild.id }
    );
    const attachment = new AttachmentBuilder(downloadedFile.buffer, {
      name: downloadedFile.name
    });

    await interaction.editReply({
      content: `Saved file: \`${clipContent(downloadedFile.path)}\``,
      files: [attachment]
    });
  }
};
