import { Collection } from "discord.js";
import addRole from "./commands/addRole.js";
import ban from "./commands/ban.js";
import channelsSetup from "./commands/channelsSetup.js";
import kick from "./commands/kick.js";
import pingVerify from "./commands/pingVerify.js";
import postLink from "./commands/postLink.js";
import postSneak from "./commands/postSneak.js";
import postUpdate from "./commands/postUpdate.js";
import purge from "./commands/purge.js";
import rolePermission from "./commands/rolePermission.js";
import roleSetup from "./commands/roleSetup.js";
import rolesSetup from "./commands/rolesSetup.js";
import setup from "./commands/setup.js";
import task from "./commands/task.js";
import ticket from "./commands/ticket.js";
import timeout from "./commands/timeout.js";
import verify from "./commands/verify.js";

export const commands = [
  setup,
  channelsSetup,
  rolePermission,
  addRole,
  roleSetup,
  rolesSetup,
  pingVerify,
  postLink,
  postUpdate,
  postSneak,
  task,
  verify,
  ticket,
  ban,
  kick,
  timeout,
  purge
];

export function createCommandCollection() {
  return new Collection(commands.map((command) => [command.data.name, command]));
}

export function commandPayloads() {
  return commands.map((command) => command.data.toJSON());
}
