import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import { createEmbed, successEmbed } from "../utils/embeds.js";

const ROBLOX_GROUP_URL = "https://www.roblox.com/groups/437848777";
const ROBLOX_ICON_URL = "https://www.roblox.com/favicon.ico";

async function resolveRobloxButtonEmoji(guild) {
  const emojis = await guild.emojis.fetch().catch(() => guild.emojis.cache);
  const robloxEmoji = emojis.find((emoji) => /roblox|rbx|robloxlogo|ro-?blox/i.test(emoji.name));

  return robloxEmoji
    ? { id: robloxEmoji.id, name: robloxEmoji.name, animated: robloxEmoji.animated }
    : { name: "🔗" };
}

function createRobloxLinkEmbed() {
  return createEmbed({
    title: "Zenoria Roblox Group",
    description: "Join the official Zenoria Roblox group through the button below.",
    thumbnail: ROBLOX_ICON_URL
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName("post_link")
    .setDescription("Post the official Zenoria Roblox group link button.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Where to post the link. Defaults to this channel.")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetChannel = interaction.options.getChannel("channel") ?? interaction.channel;

    if (!targetChannel || typeof targetChannel.send !== "function") {
      throw new Error("I can only post the Roblox link in a text or announcement channel.");
    }

    const buttonEmoji = await resolveRobloxButtonEmoji(interaction.guild);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Roblox Group")
        .setEmoji(buttonEmoji)
        .setURL(ROBLOX_GROUP_URL)
    );

    const message = await targetChannel.send({
      content: "Official Zenoria Roblox group is ready here:",
      embeds: [createRobloxLinkEmbed()],
      components: [row]
    });

    await interaction.editReply({
      embeds: [
        successEmbed("Posted Roblox Link", `Sent the Roblox group button in ${targetChannel}.`, [
          { name: "Message", value: `[Open message](${message.url})` }
        ])
      ]
    });
  }
};
