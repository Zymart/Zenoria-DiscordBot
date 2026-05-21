import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { closeTicket, createTicket } from "../services/tickets.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Create or close support tickets.")
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Open a private support ticket.")
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("What do you need help with?")
            .setMaxLength(500)
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("close")
        .setDescription("Close the current ticket.")
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Why is this ticket being closed?")
            .setMaxLength(500)
            .setRequired(false)
        )
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const subcommand = interaction.options.getSubcommand();
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    if (subcommand === "create") {
      const result = await createTicket(interaction.guild, member, reason);
      await interaction.editReply({ embeds: [result.embed] });
      return;
    }

    const embed = await closeTicket(interaction.guild, interaction.channel, member, reason);
    await interaction.editReply({ embeds: [embed] });
  }
};
