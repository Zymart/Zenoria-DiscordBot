import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import {
  downloadStorageFileToLocal,
  uploadDiscordAttachment
} from "../services/storage.js";
import { successEmbed } from "../utils/embeds.js";

function clipField(value) {
  const text = String(value ?? "");
  return text.length > 1000 ? `${text.slice(0, 997)}...` : text;
}

function fileLinkField(url) {
  return url ? [{ name: "File URL", value: `[Open file](${url})` }] : [];
}

export default {
  data: new SlashCommandBuilder()
    .setName("savefile")
    .setDescription("Save Discord files to Supabase Storage or download them locally.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("upload")
        .setDescription("Save a Discord attachment to Supabase Storage.")
        .addAttachmentOption((option) =>
          option
            .setName("file")
            .setDescription("The file to save.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("folder")
            .setDescription("Optional Supabase folder. Defaults to savefile.")
            .setMaxLength(100)
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Optional saved file name.")
            .setMaxLength(100)
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("download")
        .setDescription("Download a Supabase Storage path to the bot's local files.")
        .addStringOption((option) =>
          option
            .setName("path")
            .setDescription("Storage path from /savefile upload.")
            .setMaxLength(1000)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Optional local file name.")
            .setMaxLength(100)
            .setRequired(false)
        )
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "upload") {
      const file = interaction.options.getAttachment("file", true);
      const savedFile = await uploadDiscordAttachment(file, {
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        folder: interaction.options.getString("folder") ?? "savefile",
        fileName: interaction.options.getString("name") ?? file.name
      });

      await interaction.editReply({
        embeds: [
          successEmbed("File Saved", `Uploaded \`${clipField(file.name)}\` to Supabase Storage.`, [
            { name: "Copy Name", value: clipField(savedFile.path) },
            ...fileLinkField(savedFile.url)
          ])
        ]
      });
      return;
    }

    const downloadedFile = await downloadStorageFileToLocal(
      interaction.options.getString("path", true),
      { fileName: interaction.options.getString("name") ?? undefined }
    );

    await interaction.editReply({
      embeds: [
        successEmbed("File Downloaded", "Downloaded the Supabase file to the bot's local files.", [
          { name: "Storage Path", value: clipField(downloadedFile.path) },
          { name: "Local Path", value: clipField(downloadedFile.localPath) },
          { name: "Size", value: `${downloadedFile.bytes.toLocaleString()} bytes`, inline: true }
        ])
      ]
    });
  }
};
