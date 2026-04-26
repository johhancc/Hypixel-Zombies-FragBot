# Changelog

All notable changes to **Hypixel-Zombies-FragBot** are documented here.

---


## [3.3.1] - 2026-04-25

### ⚙️ Fixes

#### Party Invite Detection — Moderator Invites
- Fixed a bug where a bot invited to a party **by a moderator** (instead of directly by the party leader) would create a duplicate session under the moderator's name instead of joining the existing leader's session.
- Previously, the message `[RANK] Moderator has invited you to join [RANK] Leader's party!` caused the bot to register the **moderator** as the party leader.
- The invite regex now captures **two groups**: the inviter (for `/party accept`) and the actual party owner (for session management and `bot.invitedBy`).
- Bots invited via a third-party now correctly attach to the existing party session of the real leader.

---


## [3.3.0] - 2026-04-25


### 🆕 New Features

#### Centralized Session Architecture (`sessionManager.js`)
- Shouts down the isolated `activeParties` system. Bots no longer maintain parallel, conflicting configurations for a single lobby.
- **Fully Isolated Workspaces:** Inviting multiple bots bundles them securely into a dedicated single session instance tied directly to the inviter.
- Guarantees complete command isolation. Settings like `!mute` don't "leak" between disjointed party channels.

#### Structured Lifecycle Timers
- Central session automatically attaches, enforces, and destroys timers cleanly:
  - **Anti-Idle Timer:** Evaluates 20 real-time seconds.
  - **Troll Safeguard:** Forces bot eviction if 60 real-time seconds pass without an active game context.

#### Deterministic Auto-Reassignment
- Smart election routines determine initial roles instantly.
- Fallbacks safely transition leadership to standby bots seamlessly if necessary.

---

## [3.2.0] - 2026-04-25

### 🆕 New Features

#### Global Queue System (`!queue` via DM)
- Added a global FIFO queue mechanism for whitelisted players waiting on busy bots.
- Users receive instant position tracking updates (`!queue` via DM).
- **Proactive Notification Engine:** When a bot becomes free, it attempts direct message delivery via `/f add`.
- Includes automated secondary fallback routing using the initiating connection if direct transmission fails.

#### Direct Message Command Management (`!add` / `!remove`)
- Authorized administrators can add or remove players from the whitelist using DMs.

#### Dynamic Auto-Reset Limits & Protections
- Automated reset routines clear states like `stayMode` and `muted` directly upon expiration.
- Warns of upcoming drops through predictive notifications:
  - *10s Leave Warning*
  - *2-Game Remaining Alert*
  - *1-Minute Cooldown Enforcement*

### ⚙️ Fixes

#### Timer Logic Calibration
- Synchronized time discrepancies by shifting target intervals slightly, ensuring real-time calculations reflect closer to ~30 total game seconds accurately.

---

## [3.1.0] - 2025-04-25

### 🆕 New Features

#### Bot Memory & Party State Recovery
- Bots now automatically run `/party list` on spawn to detect if they were already in a party before the bot was restarted.
- The party leader and bot role (Help Bot) are recovered from the live party list, so bots resume responding to commands immediately after a CMD restart without needing to be re-invited.
- Bots correctly handle the "You are not currently in a party" message and reset their state.

#### Playtime Tracking
- Each bot now tracks its total uptime in a persistent `bots/hoursOfUse.json` file.
- Uptime is displayed in a human-readable format: `Xd Yh Zm Ws` (e.g. `2d 4h 15m 12s`).
- Uptime is updated every 60 seconds in the background.

#### Improved Party Join Message
- The party join message now displays per-bot `Playtime` instead of the old Stay/GL combined line.
- Example: `Invites: 42 ● Games: 18 ● Playtime: 1d 3h 22m`

#### Help Bot Stay Mode Announcement
- The designated Help Bot sends a separate follow-up message after announcing it's ready: `Stay Mode: ON | Mute: OFF`.
- This clearly communicates both the Stay and Mute status to the party at a glance.

#### Unique GL Messages Pool
- Implemented a shared in-memory pool (`recentGlMessages`) across all bots in the same party.
- Before sending a GL message, each bot filters out messages recently used by other bots to guarantee all messages in the party are unique for that round.
- The pool resets automatically 5 seconds after the game starts.

#### DM → Auto Status
- Any direct message received from a whitelisted user now automatically triggers the `!status` response, without needing to type the command explicitly.

### ⚙️ Changes

#### Help Bot Leader Election Fix
- `helpBot: true` is no longer persisted in `botStates.json`. This was the root cause of the "double leader" bug where two bots responded to commands after a restart.
- On every startup, leadership is always freshly determined by whichever bot joins the party first, preventing any conflicts.

#### `!stay` & `!mute` Permission Update
- **Whitelisted users** (non-admins) can now use `!stay` and `!mute`.
- **Admins** retain full, unrestricted access with no limits.

#### Non-Admin Party Limits (Stay Mode)
- When a non-admin activates Stay Mode, the following rules apply:
  - **30-Second Leave Timer:** After a game starts (countdown reaches 1 second), a 30-second timer begins. If the party leader does not warp to another map within that window, the bots assume the player stayed in the game and automatically leave the party.
  - **3-Game Limit:** The timer is cancelled and reset if a new warp is detected. However, non-admins are limited to a maximum of **3 game warps** per party session. On the 4th warp attempt, bots immediately leave the party.

#### `glEnabled` State Fix
- Fixed a bug where `glEnabled` defaulted to `false` if the saved value was explicitly `false` due to JavaScript's `||` operator short-circuiting. Now uses explicit `!== undefined` check.

---

## [3.0.0] - 2025-04-22

### 🆕 New Features
- Centralized statistics tracking via `statsUtils.js` (`invitationCounts.json`, `gameJoins.json`).
- Debounce mechanism for `addGame` to prevent multiple bots from counting the same game start.
- Designated "Help Bot" system — only the first bot to join a party responds to commands.
- Command leader election (`commandLeaders`) to prevent multiple bots from handling the same command simultaneously.
- `!mute` / `!unmute` commands to silence all bots in a party.
- `!kick`, `!promote`, `!warp`, `!disband`, `!leave` party utility commands.
- `!ping`, `!lobby`, `!de`, `!bb`, `!aa` game utility commands.
- Fun commands: `!sneak`, `!twerk`, `!jump`, `!spin`, `!look`.
- Multi-language support with `translations.json` and per-user language preferences.
- Hourly backup of `invitationCounts.json`.
- Bot state persistence (`botStates.json`) for `stayMode`, `glEnabled`, and `language`.

---

## [2.x] - Legacy

- Initial multi-bot implementation with basic party invite acceptance.
- Automatic leave after game start.
- GL messages on game start.
- Discord webhook notifications.
- Microsoft authentication.
