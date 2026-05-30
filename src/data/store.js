import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

const statePath = path.resolve(process.cwd(), config.dataFile);

function createDefaultGuildState() {
  return {
    setup: {
      completedAt: null,
      version: 1
    },
    roles: {},
    categories: {},
    channels: {},
    panels: {},
    tickets: {
      counter: 0,
      openByUser: {},
      metaByChannel: {}
    },
    warnings: {
      counter: 0,
      byUser: {}
    },
    tasks: {
      counter: 0,
      items: {}
    }
  };
}

async function readStateFile() {
  try {
    const raw = await fs.readFile(statePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return { guilds: {} };
    }

    throw error;
  }
}

async function writeStateFile(state) {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function normalizeGuildState(state, guildId) {
  state.guilds ??= {};
  state.guilds[guildId] ??= createDefaultGuildState();

  const guildState = state.guilds[guildId];
  guildState.setup ??= { completedAt: null, version: 1 };
  guildState.roles ??= {};
  guildState.categories ??= {};
  guildState.channels ??= {};
  guildState.panels ??= {};
  guildState.tickets ??= { counter: 0, openByUser: {}, metaByChannel: {} };
  guildState.tickets.openByUser ??= {};
  guildState.tickets.metaByChannel ??= {};
  guildState.warnings ??= { counter: 0, byUser: {} };
  guildState.warnings.byUser ??= {};
  guildState.tasks ??= { counter: 0, items: {} };
  guildState.tasks.items ??= {};

  return guildState;
}

export async function getGuildState(guildId) {
  const state = await readStateFile();
  return normalizeGuildState(state, guildId);
}

export async function updateGuildState(guildId, updater) {
  const state = await readStateFile();
  const guildState = normalizeGuildState(state, guildId);
  const result = await updater(guildState);

  await writeStateFile(state);
  return result ?? guildState;
}
