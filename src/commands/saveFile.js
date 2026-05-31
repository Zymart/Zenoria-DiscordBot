import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { listSavedFolders, uploadDiscordAttachment } from "../services/storage.js";
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
    .setDescription("Upload Discord files to Supabase Storage.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("upload")
        .setDescription("Upload a Discord attachment into Supabase Storage.")
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
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Optional saved file name.")
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

    throw new Error("Unknown savefile action.");
  },
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const folders = await listSavedFolders({ guildId: interaction.guild.id }).catch(() => ["savefile"]);
    const choices = folders
      .filter((folder) => folder.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((folder) => ({ name: folder, value: folder }));

    await interaction.respond(choices);
  }
};
