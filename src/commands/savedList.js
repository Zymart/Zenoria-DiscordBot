import { AttachmentBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { listSavedFiles } from "../services/storage.js";

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatSavedFiles(files) {
  return files
    .map((file, index) => `${index + 1}. ${file.name} (${formatBytes(file.size)})\ncopy name: \`${file.path}\``)
    .join("\n\n");
}

export default {
  data: new SlashCommandBuilder()
    .setName("savedlist")
    .setDescription("List files saved in Supabase Storage.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("search")
        .setDescription("Optional file name search.")
        .setMaxLength(100)
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("How many files to show. Defaults to 25.")
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const files = await listSavedFiles({
      guildId: interaction.guild.id,
      search: interaction.options.getString("search") ?? undefined,
      limit: interaction.options.getInteger("limit") ?? 25
    });

    if (files.length === 0) {
      await interaction.editReply("No saved files found.");
      return;
    }

    const listText = formatSavedFiles(files);
    const message = `Copy the copy name into \`/get filename:\`.\n\n${listText}`;

    if (message.length <= 1900) {
      await interaction.editReply(message);
      return;
    }

    const attachment = new AttachmentBuilder(Buffer.from(listText, "utf8"), {
      name: "saved-files.txt"
    });

    await interaction.editReply({
      content: "The saved file list is long, so I attached it as a text file. Copy a `copy name` into `/get filename:`.",
      files: [attachment]
    });
  }
};
