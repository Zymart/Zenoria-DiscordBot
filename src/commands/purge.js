import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { sendLog } from "../services/logger.js";
import { successEmbed } from "../utils/embeds.js";

export default {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Bulk delete recent messages.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of recent messages to delete.")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Only delete messages from this user.")
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.channel?.isTextBased() || !interaction.channel.bulkDelete) {
      throw new Error("This command can only be used in a text channel.");
    }

    const amount = interaction.options.getInteger("amount", true);
    const user = interaction.options.getUser("user");
    const messages = await interaction.channel.messages.fetch({ limit: amount });
    const messagesToDelete = user
      ? messages.filter((message) => message.author.id === user.id)
      : messages;
    const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);

    await sendLog(interaction.guild, {
      title: "Messages Purged",
      description: `${interaction.user.tag} deleted ${deleted.size} message(s) in ${interaction.channel}.`,
      fields: user ? [{ name: "Filtered User", value: user.tag, inline: true }] : [],
      color: 0x95a5a6
    });

    await interaction.editReply({
      embeds: [successEmbed("Messages Purged", `Deleted ${deleted.size} message(s).`)]
    });
  }
};
