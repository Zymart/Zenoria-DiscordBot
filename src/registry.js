import { Collection } from "discord.js";
import addRole from "./commands/addRole.js";
import applicationAccept from "./commands/applicationAccept.js";
import applicationDeny from "./commands/applicationDeny.js";
import ban from "./commands/ban.js";
import channelsSetup from "./commands/channelsSetup.js";
import cleanUnverifiedDevs from "./commands/cleanUnverifiedDevs.js";
import deleteSavedFile from "./commands/deleteSavedFile.js";
import getFile from "./commands/getFile.js";
import kick from "./commands/kick.js";
import lock from "./commands/lock.js";
import memberInfo from "./commands/memberInfo.js";
import postFaq from "./commands/postFaq.js";
import pingVerify from "./commands/pingVerify.js";
import postLink from "./commands/postLink.js";
import postReady from "./commands/postReady.js";
import postSneak from "./commands/postSneak.js";
import postUpdate from "./commands/postUpdate.js";
import purge from "./commands/purge.js";
import removeRole from "./commands/removeRole.js";
import rolePermission from "./commands/rolePermission.js";
import roleSetup from "./commands/roleSetup.js";
import rolesSetup from "./commands/rolesSetup.js";
import saveFile from "./commands/saveFile.js";
import savedList from "./commands/savedList.js";
import setup from "./commands/setup.js";
import task from "./commands/task.js";
import ticket from "./commands/ticket.js";
import timeout from "./commands/timeout.js";
import unlock from "./commands/unlock.js";
import verify from "./commands/verify.js";
import warn from "./commands/warn.js";
import warnings from "./commands/warnings.js";

export const commands = [
  setup,
  channelsSetup,
  rolePermission,
  addRole,
  removeRole,
  cleanUnverifiedDevs,
  roleSetup,
  rolesSetup,
  saveFile,
  savedList,
  getFile,
  deleteSavedFile,
  pingVerify,
  postFaq,
  postLink,
  postReady,
  postUpdate,
  postSneak,
  applicationAccept,
  applicationDeny,
  task,
  verify,
  memberInfo,
  ticket,
  ban,
  kick,
  timeout,
  purge,
  lock,
  unlock,
  warn,
  warnings
];

export function createCommandCollection() {
  return new Collection(commands.map((command) => [command.data.name, command]));
}

export function commandPayloads() {
  return commands.map((command) => command.data.toJSON());
}
