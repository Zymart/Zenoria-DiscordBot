import {
  ActionRowBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from "discord.js";
import { getGuildState } from "../data/store.js";
import { createEmbed } from "../utils/embeds.js";

export const faqSelectId = "faq:select";

const gameOverview = `# Zenoria — Simple Game Overview

Zenoria is a fantasy RPG game set inside a large empire world where players grow stronger, explore different regions, fight enemies, and progress through the world with other players.

The game focuses on:

* progression
* exploration
* teamwork
* combat
* world immersion

Players begin as ordinary adventurers and slowly become stronger through leveling, equipment, skills, and exploration.

The world of Zenoria contains:

* kingdoms
* forests
* villages
* castles
* dangerous regions
* hidden locations

As players progress, they unlock stronger abilities, encounter harder enemies, and gain access to more dangerous areas of the world.

The game encourages players to:

* explore the map
* fight enemies
* complete quests
* team up with others
* improve their builds

Zenoria is designed to feel like a living fantasy world inspired by large MMORPG experiences while remaining immersive and progression-focused.

The visual style is based on:

* medieval fantasy
* holy empire architecture
* magical civilizations

The atmosphere aims to feel:

* grand
* adventurous
* mysterious
* alive

Combat plays a major role in the gameplay experience. Players use different classes, abilities, and equipment to create their own combat style and progression path.

The world is designed to expand over time with future regions, enemies, systems, and events.

The main goal of Zenoria is creating a long-term RPG experience where players continuously grow stronger while becoming more connected to the world and its community.`;

function createFaqSelectRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(faqSelectId)
      .setPlaceholder("Choose a FAQ topic")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("What is this game about?")
          .setDescription("Learn what Zenoria is and how the game works.")
          .setValue("game_about"),
        new StringSelectMenuOptionBuilder()
          .setLabel("How to apply as developer")
          .setDescription("Where to apply for a developer position.")
          .setValue("apply_developer")
      )
  );
}

export function createFaqPanelPayload() {
  return {
    embeds: [
      createEmbed({
        title: "Zenoria FAQ",
        description: "Select a topic below to view the answer."
      })
    ],
    components: [createFaqSelectRow()]
  };
}

async function getApplicationChannelMention(guild) {
  const state = await getGuildState(guild.id).catch(() => null);
  const channelId = state?.channels?.["ticket-for-applying"];
  const channel = channelId &&
    (guild.channels.cache.get(channelId) ?? await guild.channels.fetch(channelId).catch(() => null));

  return channel ? `${channel}` : "`ticket-for-applying`";
}

export async function handleFaqSelect(interaction) {
  const selected = interaction.values[0];

  if (selected === "game_about") {
    await interaction.reply({
      embeds: [
        createEmbed({
          title: "What Is This Game About?",
          description: gameOverview
        })
      ],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (selected === "apply_developer") {
    const applicationChannel = await getApplicationChannelMention(interaction.guild);

    await interaction.reply({
      embeds: [
        createEmbed({
          title: "How To Apply As Developer",
          description: `Go to ${applicationChannel}.\n\nWhen the ticket opens, tell the team what developer role you want, your experience, examples of your work, your timezone, and anything else owners or managers should know.`
        })
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}
