import "dotenv/config";

function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseColor(value) {
  const normalized = String(value ?? "E2231A").replace("#", "");
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : 0xe2231a;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseIdList(value, fallback = []) {
  if (!value) return fallback;

  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const config = {
  token: process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  autoDeployCommands: parseBoolean(process.env.AUTO_DEPLOY_COMMANDS, false),
  brandName: process.env.BRAND_NAME ?? "Zenoria",
  embedColor: parseColor(process.env.EMBED_COLOR),
  dataFile: process.env.DATA_FILE ?? "./data/state.json",
  storage: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "discord-files",
    publicBucket: parseBoolean(process.env.SUPABASE_STORAGE_PUBLIC, false),
    signedUrlExpiresIn: parsePositiveInteger(
      process.env.SUPABASE_SIGNED_URL_EXPIRES_SECONDS,
      60 * 60
    )
  },
  setup: {
    verifiedRoleName: process.env.VERIFIED_ROLE_NAME ?? "Verified",
    memberRoleName: process.env.MEMBER_ROLE_NAME ?? "Member",
    supportRoleName: process.env.SUPPORT_ROLE_NAME ?? "Support Team",
    ticketCategoryName: process.env.TICKET_CATEGORY_NAME ?? "╭・🎫 𝐓𝐈𝐂𝐊𝐄𝐓𝐒",
    logChannelKey: process.env.LOG_CHANNEL_KEY ?? "discord_logs",
    logChannelName: process.env.LOG_CHANNEL_NAME ?? "🧾・discord_logs",
    verifyChannelKey: process.env.VERIFY_CHANNEL_KEY ?? "verify",
    verifyChannelName: process.env.VERIFY_CHANNEL_NAME ?? "✅・verify",
    supportChannelKey: process.env.SUPPORT_CHANNEL_KEY ?? "support",
    supportChannelName: process.env.SUPPORT_CHANNEL_NAME ?? "🎫・support",
    welcomeChannelKey: process.env.WELCOME_CHANNEL_KEY ?? "welcome",
    welcomeChannelName: process.env.WELCOME_CHANNEL_NAME ?? "👋・welcome",
    wipeChannelsOnSetup: parseBoolean(process.env.WIPE_CHANNELS_ON_SETUP, true),
    protectedChannelIds: parseIdList(
      process.env.PROTECTED_CHANNEL_IDS,
      ["1505108163387719750"]
    )
  }
};

export function requireRuntimeConfig({ deploy = false } = {}) {
  const missing = [];

  if (!config.token) missing.push("BOT_TOKEN");
  if (deploy && !config.clientId) missing.push("CLIENT_ID");

  if (missing.length > 0) {
    throw new Error(`Missing required environment value(s): ${missing.join(", ")}`);
  }
}
