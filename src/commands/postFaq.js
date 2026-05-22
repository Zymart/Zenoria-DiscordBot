import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { getGuildState, updateGuildState } from "../data/store.js";
import { createFaqPanelPayload } from "../services/faq.js";
import { successEmbed } from "../utils/embeds.js";

async function resolveFaqChannel(interaction) {
  const selectedChannel = interaction.options.getChannel("channel");
  if (selectedChannel) return selectedChannel;

  const state = await getGuildState(interaction.guild.id);
  const storedChannel = state.channels.faq &&
    (interaction.guild.channels.cache.get(state.channels.faq) ??
      await interaction.guild.channels.fetch(state.channels.faq).catch(() => null));

  return storedChannel ?? interaction.channel;
}

export default {
  data: new SlashCommandBuilder()
    .setName("post_faq")
    .setDescription("Post or update the FAQ dropdown panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Where to post the FAQ panel. Defaults to the FAQ channel.")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = await resolveFaqChannel(interaction);
    const state = await getGuildState(interaction.guild.id);
    let message = state.panels.faqMessageId
      ? await channel.messages.fetch(state.panels.faqMessageId).catch(() => null)
      : null;

    if (message) {
      await message.edit(createFaqPanelPayload());
    } else {
      message = await channel.send(createFaqPanelPayload());
    }

    await updateGuildState(interaction.guild.id, (guildState) => {
      guildState.channels.faq = channel.id;
      guildState.panels.faqMessageId = message.id;
    });

    await interaction.editReply({
      embeds: [
        successEmbed("FAQ Panel Posted", `The FAQ dropdown panel is ready in ${channel}.`, [
          { name: "Message", value: `[Open message](${message.url})` }
        ])
      ]
    });
  }
};
