# Zenoria DiscordBot

A Discord.js bot that builds a professional official Roblox game server structure with slash commands, role/channel setup, tickets, verification, welcome messages, moderation, logging, and clean configuration.

## Requirements

- Node.js `22.12.0` or newer
- A Discord bot with these scopes: `bot` and `applications.commands`
- Bot permissions: `Administrator` is easiest for setup, or at minimum `Manage Roles`, `Manage Channels`, `Manage Server`, `Create Invite`, `Attach Files`, `Kick Members`, `Ban Members`, `Moderate Members`, `Manage Messages`, and `View Audit Log`
- Enable the `Server Members Intent` in the Discord Developer Portal for welcome and verification role assignment
- Enable the `Message Content Intent` in the Discord Developer Portal so `/post_ready` can read the message you send after the prompt

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your `.env` file from `.env.example` and fill in `BOT_TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID`.

3. Deploy slash commands:

   ```bash
   npm run deploy
   ```

4. Start the bot:

   ```bash
   npm start
   ```

5. In your Discord server, run:

   ```text
   /setup
   ```

By default, `/setup` deletes existing channels first and rebuilds the styled official server layout. The channel `1505108163387719750` is protected by default because it came from the channel link you provided.

Use `/setup force:true` when the server was already set up and you intentionally want to rebuild it again. Use `/setup force:true wipe_channels:false` if you only want to resync roles, overwrites, and missing setup resources without deleting channels.

## Commands

- `/setup` creates the official server roles, categories, channels, permissions, verification panel, and ticket panel.
- `/channels_setup` finds existing official channels, adds missing channels, syncs permissions, and removes deprecated `changelogs` / `game-news` channels.
- `/role_permission` syncs current official channel permissions without creating or deleting channels.
- `/add_role` adds a manageable role to a member.
- `/remove_role` removes a manageable role from a member.
- `/clean_unverified_devs` removes developer roles from members who are not verified.
- `/role_setup` and `/roles_setup` clean non-official roles below the bot, keep existing official roles, and add missing official roles.
- `/verify` gives the member `Verified` and `Member`.
- `/pingverify` DMs members who still do not have the `Verified` role.
- `/post_faq` posts or refreshes the FAQ dropdown panel.
- `/post_link` posts the official Roblox group embed with a link button.
- `/post_ready` prompts for your next message, combines up to 10 attached photos into one embed image, deletes your original message, uses the official Roblox group link, creates a permanent Discord invite, and posts forward-friendly embed links.
- `/post_update` posts an official update embed to the updates channel.
- `/post_sneak` posts a spoilered sneak peek file to the sneak-peeks channel.
- `/application_accept` accepts an application ticket, gives a role, and closes the ticket.
- `/application_deny` denies an application ticket and closes it.
- `/task` creates a development task thread inside the matching specialty channel, pings the assigned role, and routes completed work to leadership approval.
- `/ticket create` opens a private support ticket.
- `/ticket close` closes the current ticket channel.
- `/member_info` shows useful member details.
- `/ban`, `/kick`, `/timeout`, and `/purge` provide moderation tools.
- `/lock` and `/unlock` control whether regular members can send messages in a channel.
- `/warn` and `/warnings` save and view member warnings.

## Notes

- The setup is duplicate-safe. Existing roles and channels are reused by name and updated instead of duplicated.
- The setup can rebuild channels from scratch. Protected channel IDs are controlled by `PROTECTED_CHANNEL_IDS`.
- `/role_setup` never deletes official roles, `@everyone`, managed/integration roles, roles assigned to the bot, or roles at/above the bot's highest role.
- Verification uses the styled `✅・verify` channel for the button, then posts verified members with their avatar in `👋・welcome`.
- The `faq` channel has a dropdown FAQ panel with private answers for game overview and developer applications.
- The `ticket-for-applying` channel uses the same ticket system, but opens application tickets with application-focused instructions.
- Development specialty channels only allow the matching specialty role plus `Lead Developer`, `Owner`, `Co-Owner`, and `Head Manager`.
- Developer chat channels include `developer-chat`, `lead-dev-chat`, `programmer-chat`, `builder-chat`, and `creative-chat`.
- Task threads ping the assigned dev role plus `Owner`, `Co-Owner`, `Head Manager`, and `Lead Developer` when created.
- The bot stores setup state and open ticket tracking in `data/state.json`.
- The logging channel defaults to the styled `🧾・discord_logs`, which is created under the staff category.

## Render + UptimeRobot

This bot includes a lightweight health server for Render and UptimeRobot:

```text
/health
```

Deploy on Render as a **Web Service**:

1. Push this project to GitHub.
2. In Render, create a new Web Service from the repo.
3. Use:

   ```text
   Build Command: npm install
   Start Command: npm start
   Health Check Path: /health
   ```

4. Add these environment variables in Render:

   ```env
   BOT_TOKEN=your_reset_bot_token
   CLIENT_ID=your_application_client_id
   GUILD_ID=your_server_id
   NODE_VERSION=22.12.0
   ```

5. Deploy, then open:

   ```text
   https://your-render-service.onrender.com/health
   ```

In UptimeRobot:

1. Create an HTTP(s) monitor.
2. URL:

   ```text
   https://your-render-service.onrender.com/health
   ```

3. Use a 5-minute interval if your plan allows it.
