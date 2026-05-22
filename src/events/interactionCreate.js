import { Events, MessageFlags } from "discord.js";
import { closeTicket, createApplicationTicket, createTicket } from "../services/tickets.js";
import { reviewTask, submitTaskForApproval } from "../services/tasks.js";
import { verifyMember } from "../services/verification.js";
import { errorEmbed } from "../utils/embeds.js";
import { sendLog } from "../services/logger.js";

async function replyWithError(interaction, error) {
  const embed = errorEmbed("Command Error", error.message || "Something went wrong while running that action.");
  const payload = { embeds: [embed], flags: MessageFlags.Ephemeral };

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ embeds: [embed] }).catch(() => null);
  } else {
    await interaction.reply(payload).catch(() => null);
  }
}

export function registerInteractionCreate(client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          throw new Error("That command is not registered in this bot process.");
        }

        await command.execute(interaction, client);
        return;
      }

      if (interaction.isButton()) {
        if (!interaction.inGuild()) {
          throw new Error("This button only works inside a server.");
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (interaction.customId === "verify:member") {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const result = await verifyMember(interaction.guild, member);
          await interaction.editReply({ embeds: [result.embed] });
          return;
        }

        if (interaction.customId === "ticket:create") {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const isApplicationPanel = interaction.channel?.name?.includes("ticket-for-applying");
          const result = isApplicationPanel
            ? await createApplicationTicket(interaction.guild, member)
            : await createTicket(interaction.guild, member, "Opened from support panel");
          await interaction.editReply({ embeds: [result.embed] });
          return;
        }

        if (interaction.customId === "ticket:close") {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const embed = await closeTicket(interaction.guild, interaction.channel, member, "Closed with ticket button");
          await interaction.editReply({ embeds: [embed] });
          return;
        }

        if (interaction.customId.startsWith("task:done:")) {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const [, , taskId] = interaction.customId.split(":");
          const embed = await submitTaskForApproval(interaction.guild, member, taskId);
          await interaction.editReply({ embeds: [embed] });
          return;
        }

        if (interaction.customId.startsWith("task:approve:")) {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const [, , taskId] = interaction.customId.split(":");
          const embed = await reviewTask(interaction.guild, member, taskId, true);
          await interaction.editReply({ embeds: [embed] });
          return;
        }

        if (interaction.customId.startsWith("task:reject:")) {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const [, , taskId] = interaction.customId.split(":");
          const embed = await reviewTask(interaction.guild, member, taskId, false);
          await interaction.editReply({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error(error);
      await replyWithError(interaction, error);
      await sendLog(interaction.guild, {
        title: "Bot Error",
        description: error.message || "Unknown error",
        color: 0xe74c3c
      }).catch(() => null);
    }
  });
}
