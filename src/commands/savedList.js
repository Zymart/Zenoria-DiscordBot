import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { listSavedFiles } from "../services/storage.js";
import { createEmbed } from "../utils/embeds.js";

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function groupFilesByFolder(files) {
  const groups = new Map();

  for (const file of files) {
    if (!groups.has(file.folder)) groups.set(file.folder, []);
    groups.get(file.folder).push(file);
  }

  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function createFileField(file) {
  const fileName = file.name.length > 220 ? `${file.name.slice(0, 217)}...` : file.name;

  return {
    name: `${fileName} (${formatBytes(file.size)})`,
    value: `Storage Name\n\`${file.path}\``,
    inline: false
  };
}

function createSavedListEmbeds(files) {
  const embeds = [];

  for (const [folder, folderFiles] of groupFilesByFolder(files)) {
    for (let index = 0; index < folderFiles.length; index += 10) {
      const batch = folderFiles.slice(index, index + 10);
      embeds.push(createEmbed({
        title: `Saved Files: ${folder}`,
        description: "Top line is the visible file name. Copy the Storage Name into `/getfile filename:`.",
        fields: batch.map(createFileField)
      }));
    }
  }

  return embeds.slice(0, 10);
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

    await interaction.editReply({ embeds: createSavedListEmbeds(files) });
  }
};
