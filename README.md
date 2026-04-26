# Hypixel Bot Manager for Zombies Fragging — v3.3.1

A robust multi-account Minecraft bot management system built with [Mineflayer](https://github.com/PrismarineJS/mineflayer) to automate participation in the **Zombies** minigame on Hypixel. Its primary goal is to facilitate efficient "fragging" by allowing bots to quickly join and leave games upon starting.

---

## 🚀 Key Features

* **Zombies Automation:** Specifically designed for the Zombies minigame on Hypixel.
* **Multi-Bot Management:** Control and coordinate multiple Minecraft bots simultaneously.
* **Smart Invitations:** Automatically accepts party invites from whitelisted users (`whitelist.json`). Correctly handles invites sent by **party moderators** on behalf of the leader.
* **Automatic Join and Leave:** Bots join the party, enter the Zombies minigame, and automatically leave once the game starts.
* **Invitation & Game Tracking:** Locally records invite and game counts per bot in JSON files.
* **Playtime Tracking:** Each bot tracks its total uptime and displays it as `Xd Yh Zm Ws`.
* **Countdown and GL Messages:** Sends countdown messages and a randomized, unique "Good Luck" (GL) message per bot before the game begins.
* **Automatic Limbo Sending:** After joining a game, bots automatically return to `/limbo`.
* **Microsoft Authentication:** Uses Microsoft authentication to log in to Minecraft accounts.
* **Discord Webhook Notifications:** Sends notifications to a Discord webhook on party events.
* **Language Support:** English and Spanish support via `translations.json`.
* **"Stay" Mode:** Option for bots to remain in the party after a game starts.
* **Persistent State:** Bot configurations (stay mode, GL enabled, language) are saved and restored between restarts (`botStates.json`).
* **Party Memory & Recovery:** On restart, bots automatically detect if they were already in a party and resume their roles without needing to be re-invited.
* **Command System:** Authorized users can execute commands in the party chat to control the bots.
* **Designated Help Bot:** The first bot to join a party is elected as the command leader to prevent duplicate responses.
* **Mute System:** Silence all bots in a party chat with `!mute` / `!unmute`.
* **Non-Admin Stay Limits:** Whitelisted (non-admin) users can use `!stay`, but are subject to a 30-second inactivity timeout, an absolute 60s timeout without active games, and a 3-game limit per party session.
* **DM Admin Commands:** Manage access with `!add` and `!remove` in DMs.
* **Global Queue (`!queue`):** Allows whitelisted users to secure bots during heavy usage periods.
* **Real-time Configuration Reload:** Config files can be reloaded without restarting the bot (`!reload`).
* **Basic Spam Detection:** Bots warn about repetitive messages in party chat.


---

## 📦 Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/malparidostodos/Hypixel-Zombies-FragBot.git
    cd Hypixel-Zombies-FragBot
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Configure the bot:**

    ```
    Hypixel-Zombies-Fragbot/
    ├── admin/
    │   ├── admin.json             # Admin list — full unrestricted access to all commands.
    │   └── whitelist.json         # Allowed users to invite your bots.
    │                              # Example: ["ProGamer", "BotMaster"]
    ├── bots/
    │   ├── accounts.json          # Bot Microsoft account credentials.
    │   │                          # Example: [{"username": "bot@outlook.com"}]
    │   ├── botStates.json         # Auto-saved bot state (stayMode, GL, language). Do not edit manually.
    │   ├── invitationCounts.json  # Per-bot invite counter. Auto-managed.
    │   ├── gameJoins.json         # Per-bot game join counter. Auto-managed.
    │   └── hoursOfUse.json        # Per-bot playtime in hours. Auto-managed.
    ├── commands/
    │   ├── add.js        (Admin)  # !add <username> — Add player to whitelist. (Usable in DM)
    │   ├── remove.js     (Admin)  # !remove <username> — Remove player from whitelist. (Usable in DM)
    │   ├── resetinvites.js (Admin)# !resetinvites — Reset all invite counters.
    │   ├── reload.js     (Admin)  # !reload — Reload all config files without restarting.
    │   ├── stay.js    (Whitelist) # !stay <on|off> — Toggle stay mode. Admins: unlimited. Whitelist: 3-game limit.
    │   ├── mute.js    (Whitelist) # !mute — Silence all bots in party chat.
    │   ├── unmute.js  (Whitelist) # !unmute — Restore bot chat.
    │   ├── bots.js                # !bots — Show bot statuses.
    │   ├── help.js                # !help — List available commands.
    │   ├── lang.js                # !lang <en|es> — Change bot language.
    │   ├── stats.js               # !stats — Show global bot statistics.
    │   ├── status.js              # !status — Show current bot location and state.
    │   └── say.js                 # !say <message> — Make the help bot say something.
    ├── data/
    │   ├── autoResponses.json     # Auto-reply triggers and responses.
    │   ├── glMessages.json        # Customizable "Good Luck" messages.
    │   ├── translations.json      # All bot messages in English and Spanish.
    │   ├── userLanguages.json     # Per-user language preferences.
    │   └── webhook.json           # Discord webhook URLs.
    │                              # Example: {"url": "https://discord.com/api/webhooks/...", "dmUrl": "..."}
    ├── utils/
    │   ├── botManager.js          # Core bot logic: state, commands, party management.
    │   ├── sessionManager.js      # Centralized session management (parties, timers).
    │   ├── statsUtils.js          # Centralized stats tracking (invites, games, playtime).
    │   └── userLanguageUtils.js   # Language preference helpers.
    ├── index.js                   # Main entry point.
    └── package.json               # Project metadata and dependencies.
    ```

    All you need to modify is inside `admin/`, `bots/accounts.json`, and `data/webhook.json` to get started.

---

## ▶️ Usage

```bash
npm start
```

The bots will:

1. Log in to Hypixel.
2. Run `/party list` to detect if they were already in a party (memory recovery).
3. Accept party invites from users listed in `whitelist.json`.
4. Send a join message with invite count, game count, and playtime.
5. The designated Help Bot announces its role and the current Stay Mode / Mute status.
6. Send countdown and unique GL messages when a game starts.
7. Automatically leave the party and go to limbo after the game starts (unless Stay Mode is active).

---

## ⚙️ Commands

Commands are typed in **party chat** by authorized users. Only the designated **Help Bot** responds.

| Command | Permission | Description |
|---|---|---|
| `!help` | Whitelist | Shows all available commands. |
| `!status` | Whitelist (also via DM) | Shows the bot's current location and state. |
| `!stats` | Whitelist | Shows global invite, game, and playtime stats. |
| `!bots` | Whitelist | Lists bots and their current statuses. |
| `!stay <on\|off>` | Whitelist | Toggles stay mode. Non-admins: 30s timer + 3-game limit. |
| `!mute` | Whitelist | Silences all bots in party chat. |
| `!unmute` | Whitelist | Restores bot chat. |
| `!gl <on\|off>` | Whitelist | Toggles GL messages before game start. |
| `!lang <en\|es>` | Whitelist | Changes bot language for you. |
| `!say <message>` | Whitelist | Makes the help bot say something. |
| `!add <username>` | Admin | Adds a user to the whitelist. |
| `!remove <username>` | Admin | Removes a user from the whitelist. |
| `!resetinvites` | Admin | Resets all invite counters. |
| `!reload` | Admin | Reloads all config files live. |
| `!kick` | Whitelist | Kicks the bot from the party. |
| `!warp` | Whitelist | Warps the party to a game. |
| `!promote` | Whitelist | Promotes a bot to party leader. |
| `!disband` | Whitelist | Disbands the party. |
| `!ping` | Whitelist | Shows bot ping. |
| `!lobby` | Whitelist | Sends bots to main lobby. |

> 💡 **Tip:** Any DM sent to a bot by a whitelisted user will automatically trigger a `!status` response.

---

## 🛡️ Permission Levels

| Level | Who | Access |
|---|---|---|
| **Admin** | Users in `admin/admin.json` | Full access, no restrictions |
| **Whitelist** | Users in `admin/whitelist.json` | Can use `!stay` & `!mute`, subject to 3-game / 30s limits |
| **Everyone else** | Not listed | Cannot interact with bots |

---

## 🧠 Tech Stack

* [mineflayer](https://github.com/PrismarineJS/mineflayer) — Bot framework for Minecraft.
* Node.js (v14+ required, v18+ recommended).
* Local JSON-based state tracking.
* Microsoft authentication for bot accounts.

---

## 📄 License

MIT License.

---

> See [CHANGELOG.md](./CHANGELOG.md) for the full version history.

Thanks to Gemini AI for help with this README and many other features haha