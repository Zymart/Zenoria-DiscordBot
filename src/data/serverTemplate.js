import { ChannelType, PermissionFlagsBits } from "discord.js";

const threadPermissions = [
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.CreatePrivateThreads,
  PermissionFlagsBits.SendMessagesInThreads
];

const basicTextPermissions = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory
];

const uploadTextPermissions = [
  ...basicTextPermissions,
  PermissionFlagsBits.AttachFiles,
  ...threadPermissions
];

export const roleDefinitions = [
  {
    name: "Owner",
    color: "#e2231a",
    hoist: true,
    permissions: [
      PermissionFlagsBits.Administrator,
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.ViewAuditLog,
      PermissionFlagsBits.MentionEveryone,
      PermissionFlagsBits.ManageWebhooks
    ]
  },
  {
    name: "Co-Owner",
    color: "#f04f24",
    hoist: true,
    permissions: [
      PermissionFlagsBits.Administrator,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.ViewAuditLog
    ]
  },
  {
    name: "Head Manager",
    color: "#ff7a1a",
    hoist: true,
    permissions: [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.ViewAuditLog,
      PermissionFlagsBits.ManageEvents
    ]
  },
  {
    name: "Developer",
    color: "#5865f2",
    hoist: true,
    permissions: [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.AttachFiles,
      ...threadPermissions
    ]
  },
  {
    name: "Head Admin",
    color: "#d12f8a",
    hoist: true,
    permissions: [PermissionFlagsBits.Administrator]
  },
  {
    name: "Administrator",
    color: "#c14cff",
    hoist: true,
    permissions: [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.ModerateMembers
    ]
  },
  {
    name: "Moderator",
    color: "#2f9bff",
    hoist: true,
    permissions: [
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.KickMembers
    ]
  },
  {
    name: "Trial Moderator",
    color: "#63b3ff",
    hoist: true,
    permissions: [
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ModerateMembers
    ]
  },
  {
    name: "Support Team",
    color: "#30c48d",
    hoist: true,
    permissions: [PermissionFlagsBits.SendMessages]
  },
  {
    name: "Lead Developer",
    color: "#4752c4",
    hoist: true,
    permissions: [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.AttachFiles,
      ...threadPermissions
    ]
  },
  {
    name: "Programmer",
    color: "#3b82f6",
    permissions: uploadTextPermissions
  },
  {
    name: "Builder",
    color: "#22c55e",
    permissions: uploadTextPermissions
  },
  {
    name: "Animator",
    color: "#a855f7",
    permissions: uploadTextPermissions
  },
  {
    name: "VFX Artist",
    color: "#ec4899",
    permissions: uploadTextPermissions
  },
  {
    name: "UI Designer",
    color: "#14b8a6",
    permissions: uploadTextPermissions
  },
  {
    name: "3D Modeler",
    color: "#f97316",
    permissions: uploadTextPermissions
  },
  {
    name: "Sound Designer",
    color: "#eab308",
    permissions: uploadTextPermissions
  },
  {
    name: "QA Tester",
    color: "#84cc16",
    permissions: basicTextPermissions
  },
  {
    name: "Verified",
    color: "#57f287",
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.ReadMessageHistory
    ]
  },
  {
    name: "Member",
    color: "#99aab5",
    permissions: basicTextPermissions
  },
  {
    name: "Content Creator",
    color: "#ff4fb3",
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.Stream
    ]
  },
  {
    name: "Partner",
    color: "#2dd4bf",
    permissions: basicTextPermissions
  },
  {
    name: "VIP",
    color: "#facc15",
    permissions: basicTextPermissions
  },
  {
    name: "Beta Tester",
    color: "#38bdf8",
    permissions: basicTextPermissions
  },
  {
    name: "Bots",
    color: "#7289da",
    permissions: [
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles
    ]
  }
];

export const styledCategoryDefinitions = [
  {
    key: "information",
    name: "╭・📌 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍",
    profile: "information",
    channels: [
      { key: "welcome", name: "👋・welcome", topic: "Start here and verify to unlock the Zenoria community." },
      { key: "verify", name: "✅・verify", topic: "Click the verification button to unlock the Zenoria community." },
      { key: "rules", name: "📜・rules", topic: "Official Zenoria server rules." },
      { key: "announcements", name: "📣・announcements", topic: "Official announcements from the Zenoria team." },
      { key: "updates", name: "📰・updates", topic: "Game and server updates." },
      { key: "sneak-peeks", name: "👀・sneak-peeks", topic: "Preview upcoming Zenoria content." },
      { key: "faq", name: "❔・faq", topic: "Frequently asked questions." },
      { key: "socials", name: "🔗・socials", topic: "Official Zenoria social links." }
    ]
  },
  {
    key: "community",
    name: "╭・🌍 𝐂𝐎𝐌𝐌𝐔𝐍𝐈𝐓𝐘",
    profile: "community",
    channels: [
      { key: "general", name: "💬・general" },
      { key: "media", name: "📸・media" },
      { key: "memes", name: "😂・memes" },
      { key: "fan-art", name: "🎨・fan-art" },
      { key: "screenshots", name: "🖼・screenshots" },
      { key: "clips", name: "🎬・clips" },
      { key: "suggestions", name: "💡・suggestions" },
      { key: "polls", name: "📊・polls" },
      { key: "trading", name: "🤝・trading" },
      { key: "off-topic", name: "🌙・off-topic" }
    ]
  },
  {
    key: "game",
    name: "╭・🎮 𝐆𝐀𝐌𝐄",
    profile: "game",
    channels: [
      { key: "bug-reports", name: "🐞・bug-reports", topic: "Report bugs found in-game.", profile: "supportChannel" },
      { key: "player-reports", name: "🚨・player-reports", topic: "Report player behavior for staff review.", profile: "supportChannel" },
      { key: "support", name: "🎫・support", topic: "Open a private support ticket here.", profile: "supportChannel" },
      { key: "codes", name: "🎁・codes", topic: "Official code drops." },
      { key: "giveaways", name: "🎉・giveaways", topic: "Official giveaways." },
      { key: "events", name: "📅・events", topic: "Game events and community sessions." },
      { key: "looking-for-team", name: "👥・looking-for-team", topic: "Find other players to team up with." }
    ]
  },
  {
    key: "development",
    name: "╭・🛠 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐌𝐄𝐍𝐓",
    profile: "development",
    channels: [
      { key: "developer-chat", name: "💬・developer-chat", topic: "General developer discussion for the Zenoria team." },
      { key: "lead-dev-chat", name: "👑・lead-dev-chat", topic: "Lead developer and ownership planning.", profile: "leadDevelopment" },
      { key: "programmer-chat", name: "💻・programmer-chat", topic: "Programming team chat.", profile: "scripting" },
      { key: "builder-chat", name: "🏗・builder-chat", topic: "Builder team chat.", profile: "building" },
      { key: "creative-chat", name: "🎨・creative-chat", topic: "Art, UI, animation, VFX, audio, and modeling discussion.", profile: "creativeDevelopment" },
      { key: "dev-log", name: "📘・dev-log" },
      { key: "scripting", name: "💻・scripting", profile: "scripting" },
      { key: "building", name: "🏗・building", profile: "building" },
      { key: "animation", name: "🎞・animation", profile: "animation" },
      { key: "modeling", name: "🧊・modeling", profile: "modeling" },
      { key: "ui-design", name: "🎛・ui-design", profile: "uiDesign" },
      { key: "vfx", name: "✨・vfx", profile: "vfx" },
      { key: "audio", name: "🎧・audio", profile: "audio" },
      { key: "testing", name: "🧪・testing", profile: "testing" },
      { key: "asset-review", name: "📦・asset-review" },
      { key: "balancing", name: "⚖・balancing", profile: "testing" },
      { key: "internal-bugs", name: "🧷・internal-bugs", profile: "internalBugs" }
    ]
  },
  {
    key: "staff",
    name: "╭・👑 𝐒𝐓𝐀𝐅𝐅",
    profile: "staff",
    channels: [
      { key: "staff-chat", name: "💼・staff-chat" },
      { key: "mod-chat", name: "🛡・mod-chat" },
      { key: "staff-reports", name: "📋・staff-reports" },
      { key: "appeals", name: "⚖・appeals" },
      {
        key: "discord_logs",
        name: "🧾・discord_logs",
        aliases: ["ban-logs", "ban_logs", "🧾・ban-logs", "🧾・ban_logs"]
      }
    ]
  },
  {
    key: "voice",
    name: "╭・🔊 𝐕𝐎𝐈𝐂𝐄",
    profile: "communityVoice",
    channels: [
      { key: "general-vc", name: "🔊・General VC", type: ChannelType.GuildVoice },
      { key: "grinding-vc", name: "⚔・Grinding VC", type: ChannelType.GuildVoice },
      { key: "squad-vc-1", name: "👥・Squad VC 1", type: ChannelType.GuildVoice },
      { key: "squad-vc-2", name: "👥・Squad VC 2", type: ChannelType.GuildVoice },
      { key: "development-vc", name: "🛠・Development VC", type: ChannelType.GuildVoice, profile: "developmentVoice" },
      { key: "staff-vc", name: "👑・Staff VC", type: ChannelType.GuildVoice, profile: "staffVoice" }
    ]
  }
];

export const deprecatedChannelDefinitions = [
  { key: "changelogs", name: "🧾・changelogs", aliases: ["changelogs"] },
  { key: "game-news", name: "📰・game-news", aliases: ["game-news"] }
];

export const roleGroups = {
  ownership: ["Owner", "Co-Owner", "Head Manager"],
  staff: [
    "Owner",
    "Co-Owner",
    "Head Manager",
    "Head Admin",
    "Administrator",
    "Moderator",
    "Trial Moderator"
  ],
  seniorStaff: [
    "Owner",
    "Co-Owner",
    "Head Manager",
    "Head Admin",
    "Administrator"
  ],
  support: [
    "Owner",
    "Co-Owner",
    "Head Manager",
    "Head Admin",
    "Administrator",
    "Moderator",
    "Trial Moderator",
    "Support Team"
  ],
  development: [
    "Developer",
    "Lead Developer",
    "Programmer",
    "Builder",
    "Animator",
    "VFX Artist",
    "UI Designer",
    "3D Modeler",
    "Sound Designer",
    "QA Tester"
  ],
  creators: ["Content Creator"],
  partners: ["Partner"],
  vips: ["VIP"],
  beta: ["Beta Tester"],
  community: ["Verified", "Member", "Content Creator", "Partner", "VIP", "Beta Tester"],
  bots: ["Bots"]
};

export const categoryDefinitions = [
  {
    name: "📌 INFORMATION",
    profile: "information",
    channels: [
      { name: "welcome", topic: "Start here and verify to unlock the Zenoria community." },
      { name: "verify", topic: "Click the verification button to unlock the Zenoria community." },
      { name: "rules", topic: "Official Zenoria server rules." },
      { name: "announcements", topic: "Official announcements from the Zenoria team." },
      { name: "updates", topic: "Game and server updates." },
      { name: "sneak-peeks", topic: "Preview upcoming Zenoria content." },
      { name: "faq", topic: "Frequently asked questions." },
      { name: "socials", topic: "Official Zenoria social links." }
    ]
  },
  {
    name: "🌍 COMMUNITY",
    profile: "community",
    channels: [
      { name: "general" },
      { name: "media" },
      { name: "memes" },
      { name: "fan-art" },
      { name: "screenshots" },
      { name: "clips" },
      { name: "suggestions" },
      { name: "polls" },
      { name: "trading" },
      { name: "off-topic" }
    ]
  },
  {
    name: "🎮 GAME",
    profile: "game",
    channels: [
      { name: "bug-reports", topic: "Report bugs found in-game.", profile: "supportChannel" },
      { name: "player-reports", topic: "Report player behavior for staff review.", profile: "supportChannel" },
      { name: "support", topic: "Open a private support ticket here.", profile: "supportChannel" },
      { name: "codes", topic: "Official code drops." },
      { name: "giveaways", topic: "Official giveaways." },
      { name: "events", topic: "Game events and community sessions." },
      { name: "looking-for-team", topic: "Find other players to team up with." }
    ]
  },
  {
    name: "🛠 DEVELOPMENT",
    profile: "development",
    channels: [
      { name: "developer-chat" },
      { name: "lead-dev-chat", profile: "leadDevelopment" },
      { name: "programmer-chat", profile: "scripting" },
      { name: "builder-chat", profile: "building" },
      { name: "creative-chat", profile: "creativeDevelopment" },
      { name: "dev-log" },
      { name: "scripting", profile: "scripting" },
      { name: "building", profile: "building" },
      { name: "animation", profile: "animation" },
      { name: "modeling", profile: "modeling" },
      { name: "ui-design", profile: "uiDesign" },
      { name: "vfx", profile: "vfx" },
      { name: "audio", profile: "audio" },
      { name: "testing", profile: "testing" },
      { name: "asset-review" },
      { name: "balancing", profile: "testing" },
      { name: "internal-bugs", profile: "internalBugs" }
    ]
  },
  {
    name: "👑 STAFF",
    profile: "staff",
    channels: [
      { name: "staff-chat" },
      { name: "mod-chat" },
      { name: "staff-reports" },
      { name: "appeals" },
      { name: "discord_logs", aliases: ["ban-logs", "ban_logs"] }
    ]
  },
  {
    name: "🔊 VOICE CHANNELS",
    profile: "communityVoice",
    channels: [
      { name: "General VC", type: ChannelType.GuildVoice },
      { name: "Grinding VC", type: ChannelType.GuildVoice },
      { name: "Squad VC 1", type: ChannelType.GuildVoice },
      { name: "Squad VC 2", type: ChannelType.GuildVoice },
      { name: "Development VC", type: ChannelType.GuildVoice, profile: "developmentVoice" },
      { name: "Staff VC", type: ChannelType.GuildVoice, profile: "staffVoice" }
    ]
  }
];
