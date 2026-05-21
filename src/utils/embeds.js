import { EmbedBuilder } from "discord.js";
import { config } from "../config.js";

export function createEmbed({
  title,
  description,
  color = config.embedColor,
  fields = [],
  thumbnail
}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp()
    .setFooter({ text: `${config.brandName} Official` });

  if (description) embed.setDescription(description);
  if (fields.length > 0) embed.addFields(fields);
  if (thumbnail) embed.setThumbnail(thumbnail);

  return embed;
}

export function successEmbed(title, description, fields = []) {
  return createEmbed({ title, description, color: 0x2ecc71, fields });
}

export function errorEmbed(title, description) {
  return createEmbed({ title, description, color: 0xe74c3c });
}

export function infoEmbed(title, description, fields = []) {
  return createEmbed({ title, description, color: config.embedColor, fields });
}
