import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { deleteSavedFile, getSavedFileChoices } from "../services/storage.js";
import { successEmbed } from "../utils/embeds.js";

function clipField(value) {
  const text = String(value ?? "");
  return text.length > 1000 ? `${text.slice(0, 997)}...` : text;
}

export default {
  data: new SlashCommandBuilder()
    .setName("deletesavedfile")
    .setDescription("Delete a saved file from Supabase Storage.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("filename")
        .setDescription("Copy name from /savedlist.")
        .setMaxLength(1000)
        .setAutocomplete(true)
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const deletedFile = await deleteSavedFile(
      interaction.options.getString("filename", true),
      { guildId: interaction.guild.id }
    );

    await interaction.editReply({
      embeds: [
        successEmbed("Saved File Deleted", "Deleted the file from Supabase Storage.", [
          { name: "Storage Name", value: clipField(deletedFile.path) }
        ])
      ]
    });
  },
  async autocomplete(interaction) {
    const choices = await getSavedFileChoices({
      guildId: interaction.guild.id,
      search: interaction.options.getFocused()
    }).catch(() => []);

    await interaction.respond(choices);
  }
};
