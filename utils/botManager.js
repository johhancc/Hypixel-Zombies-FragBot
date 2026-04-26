const mineflayer = require("mineflayer");
const whitelist = require("../admin/whitelist.json");
const adminList = require("../admin/admin.json");
const { url: webhookUrl, dmUrl } = require("../data/webhook.json");
const https = require("https");
const fs = require("fs");
const path = require("path");
const glMessages = require("../data/glMessages.json");
const autoResponses = require("../data/autoResponses.json");
const translations = require("../data/translations.json");
const { loadUserLanguages, saveUserLanguages } = require('../utils/userLanguageUtils');
const userLanguages = loadUserLanguages();

const botStatesPath = path.join(__dirname, '../bots/botStates.json');
const statsUtils = require('../utils/statsUtils');
const queueManager = require('../utils/queueManager');
const sessionManager = require('../utils/sessionManager');

// Tracks pending DM notifications: botUsername -> { queuedUser, originalBot }
const pendingDMNotifications = {};

const commandLeaders = {};
const commandLeaderTimeout = 2000;

let bots = [];
const botInviters = {};

const commandHandlers = {
    "!help": { module: require('../commands/help'), needsLeader: true },
    "!add": { module: require('../commands/add'), needsLeader: true },
    "!remove": { module: require('../commands/remove'), needsLeader: true },
    "!bots": { module: require('../commands/bots'), needsLeader: true },
    "!say": { module: require('../commands/say'), needsLeader: true },
    "!resetinvites": { module: require('../commands/resetinvites'), needsLeader: true },
    "!reload": { module: require('../commands/reload'), needsLeader: true },
    "!stats": { module: require('../commands/stats'), needsLeader: true },
    "!lang": { module: require('../commands/lang'), needsLeader: true },
    "!stay": { module: require('../commands/stay'), needsLeader: true },
    "!status": { module: require('../commands/status'), needsLeader: false },
    "!mute": { module: require('../commands/mute'), needsLeader: true },
    "!unmute": { module: require('../commands/unmute'), needsLeader: true },
    // Party Utils
    "!leave": { module: require('../commands/party_utils'), needsLeader: false },
    "!promote": { module: require('../commands/party_utils'), needsLeader: false },
    "!warp": { module: require('../commands/party_utils'), needsLeader: false },
    "!disband": { module: require('../commands/party_utils'), needsLeader: false },
    // Game Utils
    "!ping": { module: require('../commands/game_utils'), needsLeader: true },
    "!lobby": { module: require('../commands/game_utils'), needsLeader: false },
    "!de": { module: require('../commands/game_utils'), needsLeader: false },
    "!bb": { module: require('../commands/game_utils'), needsLeader: false },
    "!aa": { module: require('../commands/game_utils'), needsLeader: false },
    // Fun Utils
    "!sneak": { module: require('../commands/fun_utils'), needsLeader: false },
    "!twerk": { module: require('../commands/fun_utils'), needsLeader: false },
    "!jump": { module: require('../commands/fun_utils'), needsLeader: false },
    "!spin": { module: require('../commands/fun_utils'), needsLeader: false },
    "!look": { module: require('../commands/fun_utils'), needsLeader: false },
};

const inviteCooldowns = {};
const inviteCooldownDuration = 60000;
const debouncedGames = {};
const recentGlMessages = {};

function loadBotStates() {
    try {
        if (fs.existsSync(botStatesPath)) {
            const data = fs.readFileSync(botStatesPath);
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error("Error reading bot states file:", error);
        return {};
    }
}

function saveBotStates(states) {
    try {
        const statesToSave = {};
        bots.forEach(bot => {
            statesToSave[bot.username] = {
                stayMode: bot.stayMode,
                glEnabled: bot.glEnabled,
                language: bot.currentLanguage
            };
        });
        fs.writeFileSync(botStatesPath, JSON.stringify(statesToSave, null, 2));
    } catch (error) {
        console.error("Error saving bot states file:", error);
    }
}


function sendToDMWebhook(content) {
    if (!dmUrl || dmUrl.includes("discord.com/api/webhooks/$") || dmUrl === "https://discord.com/api/webhooks/") return; // Ignore dummy URLs
    const data = JSON.stringify({ content });

    const req = https.request(dmUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    }, (res) => {
        console.log(`[DM WEBHOOK] Status code: ${res.statusCode}`);
        res.on("data", d => process.stdout.write(d));
    });

    req.on("error", (error) => {
        console.error("[DM WEBHOOK] Error:", error);
    });

    req.write(data);
    req.end();
}

function sendToWebhook(content) {
    if (!webhookUrl || webhookUrl.includes("discord.com/api/webhooks/$") || webhookUrl === "https://discord.com/api/webhooks/") return; // Ignore dummy URLs
    const data = JSON.stringify({ content });

    const req = https.request(webhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    }, (res) => {
        console.log(`[WEBHOOK] Status code: ${res.statusCode}`);
        res.on("data", d => process.stdout.write(d));
    });

    req.on("error", (error) => {
        console.error("[WEBHOOK] Error:", error);
    });

    req.write(data);
    req.end();
}

function reloadConfigs() {
    try {
        delete require.cache[require.resolve('../admin/whitelist.json')];
        delete require.cache[require.resolve('../admin/admin.json')];
        delete require.cache[require.resolve('../data/glMessages.json')];
        delete require.cache[require.resolve('../data/translations.json')];
        const newWhitelist = require('../admin/whitelist.json');
        const newAdminList = require('../admin/admin.json');
        const newGlMessages = require('../data/glMessages.json');
        const newTranslations = require('../data/translations.json');

        whitelist.length = 0;
        whitelist.push(...newWhitelist);
        adminList.length = 0;
        adminList.push(...newAdminList);
        glMessages.length = 0;
        glMessages.push(...newGlMessages);

        for (const key in translations) {
            delete translations[key];
        }
        Object.assign(translations, newTranslations);

        console.log("[CONFIG] Reloaded whitelist, admin list, GL messages, and translations.");
        return true;
    } catch (error) {
        console.error("[CONFIG] Error reloading configurations:", error);
        return false;
    }
}

function translate(lang, key, ...args) {
    const languageData = translations[lang] || translations['en'];
    let translated = languageData[key] || key;
    args.forEach((arg, index) => {
        translated = translated.replace(new RegExp(`%${index + 1}`, 'g'), arg);
    });
    return translated;
}

function canInviteBot(botUsername, invitingUser) {
    if (inviteCooldowns[botUsername] &&
        inviteCooldowns[botUsername].lastInviter !== invitingUser &&
        Date.now() - inviteCooldowns[botUsername].timestamp < inviteCooldownDuration) {
        return false;
    }
    return true;
}

/**
 * Notifies the first user in the queue that a bot is now free.
 * Flow:
 *  1. Pick a free bot (not in party) to deliver the notification.
 *  2. Do /f add <user> so the bot can message them even if they have DMs restricted.
 *  3. Wait 3s, then send /msg <user>.
 *  4. Register a pending notification so the error handler can trigger the fallback
 *     (i.e. message from the originalBot if the free bot can't reach the user).
 */
function notifyQueuedUser() {
    const next = queueManager.getNext();
    if (!next) return;

    const { username: queuedUser, originalBot } = next;
    queueManager.removeFirst();

    // Find a free bot (prefer bots not in party)
    const freeBot = bots.find(b => !b.inParty) || bots[0];
    if (!freeBot) return;

    console.log(`[QUEUE] Notifying ${queuedUser} via ${freeBot.username} (fallback: ${originalBot?.username})`);

    // Step 1: friend request so DM can go through even with restricted settings
    freeBot.chat(`/f add ${queuedUser}`);

    // Step 2: register pending notification for error fallback
    pendingDMNotifications[freeBot.username] = { queuedUser, originalBot };

    // Step 3: send DM after short delay
    setTimeout(() => {
        freeBot.chat(`/msg ${queuedUser} 🔔 A bot is now free! You can invite ${freeBot.username} to play.`);
        // Clear pending after 5s (if no error was received, delivery was successful)
        setTimeout(() => {
            if (pendingDMNotifications[freeBot.username]?.queuedUser === queuedUser) {
                delete pendingDMNotifications[freeBot.username];
            }
        }, 5000);
    }, 3000);
}

function createBot({ username, language = 'en' }, index) {
    const bot = mineflayer.createBot({
        host: "mc.hypixel.net",
        username,
        auth: "microsoft",
        version: "1.8.9"
    });

    bots.push(bot);

    const botStates = loadBotStates();


    bot.stayMode = botStates[username]?.stayMode || false;
    bot.glEnabled = botStates[username]?.glEnabled !== undefined ? botStates[username]?.glEnabled : true;
    bot.inParty = false;
    bot.helpBot = false;
    bot.currentLanguage = language;
    bot.invitedBy = null;
    bot.muted = false;
    bot.joinedGame = false;
    bot.inLimbo = false;
    bot.isDesignatedHelpBot = false;

    let initialLimboTimeout;
    let lastInviteTime = Date.now();
    const inactivityThreshold = 300000;

    bot.once("spawn", () => {
        console.log(`[BOT ${index}] Connected as ${bot.username}`);
        bot.chat("/lobby arcade");

        // Ask for party list to recover state if bot was already in a party before restarting
        setTimeout(() => {
            bot.chat("/party list");
        }, 2000);

        initialLimboTimeout = setTimeout(() => {
            if (!bot.stayMode && !bot.joinedGame && !bot.inParty) {
                console.log(`[BOT ${index}] Timeout reached, sending to limbo.`);
                bot.chat("/party leave");
                bot.chat("/limbo");
                bot.inLimbo = true;
            }
        }, 60000);
    });

    setInterval(() => {
        if (bot.inParty && Date.now() - lastInviteTime > inactivityThreshold) {
            sendToWebhook(`⚠️ **${bot.username}** hasn't received an invite in a while. Possible inactivity.`);
        }
    }, 300000);

    bot.on("message", (jsonMsg) => {
        const raw = jsonMsg.toString().replace(/\n/g, " ");
        const msg = raw.toLowerCase();

        // Memory: Recover party state from /party list output
        const partyLeaderMatch = raw.match(/(?:^|-{10,}\s?)Party Leader: (?:\[.*?\] )?(\w+)/);
        if (partyLeaderMatch) {
            const leader = partyLeaderMatch[1];
            if (!bot.inParty || bot.invitedBy !== leader) {
                bot.invitedBy = leader;
                bot.inParty = true;
                bot.joinedGame = false;
                bot.inLimbo = false;
                lastInviteTime = Date.now();
                
                sessionManager.addBot(leader, bot);
                setTimeout(() => {
                    sessionManager.assignHelpBot(leader, bot, (key, ...a) => translate(bot.currentLanguage, key, ...a));
                }, 2000);
            }
        }

        const notInPartyMatch = raw.match(/(?:^|-{10,}\s?)You are not currently in a party\./);
        if (notInPartyMatch) {
            if (bot.inParty) {
                bot.inParty = false;
                bot.invitedBy = null;
                bot.helpBot = false;
                bot.isDesignatedHelpBot = false;
            }
        }

        // DEBUG: Trace invite messages
        if (raw.includes("has invited you to join their party") || raw.includes("has invited you to join")) {
            console.log(`[DEBUG ${bot.username}] Received potential invite: "${raw}"`);
        }
        const partyChatMatch = raw.match(/^Party > (?:\[.*?\] )?(\w+): (.+)/);
        let sender = null;
        if (partyChatMatch) {
            sender = partyChatMatch[1];
        } else {
            const directMatch = raw.match(/^(?:\[.*?\] )?(\w+):/);
            sender = directMatch ? directMatch[1] : null;
        }

        if (msg.includes("has disbanded the party!")) {
            console.log(`[BOT ${index}] Party disbanded.`);
            const _leader = bot.invitedBy;
            bot.inParty = false;
            bot.helpBot = false;
            bot.isDesignatedHelpBot = false;
            bot.invitedBy = null;
            if (_leader) sessionManager.destroySession(_leader);
        }

        if (msg.includes("you have been kicked from the party by")) {
            console.log(`[BOT ${index}] Kicked from party.`);
            const _leader = bot.invitedBy;
            if (_leader) {
                sessionManager.removeBot(_leader, bot, bots, notifyQueuedUser, translate);
            } else {
                bot.inParty = false;
                bot.helpBot = false;
                bot.isDesignatedHelpBot = false;
                bot.invitedBy = null;
            }
        }

        if (msg.includes("has invited all members")) {
            const matchGuild = raw.match(/(?:\[.*?\] )?(\w+) has invited all members/i);
            if (matchGuild && whitelist.includes(matchGuild[1])) {
                const inviter = matchGuild[1];
                bot.invitedBy = inviter;
                console.log(`[BOT ${index}] Accepting guild party invite from ${inviter}`);
                bot.chat(`/party accept ${inviter}`);
                bot.inParty = true;
                bot.joinedGame = false;
                bot.inLimbo = false;
                bot.muted = false; // Reset mute state on new party
                lastInviteTime = Date.now();



                statsUtils.addInvite(bot.username);
                const stats = statsUtils.getGlobalStats();

                const delay = Math.floor(Math.random() * 1000) + 500;
                setTimeout(() => {
                    const session = sessionManager.getSession(inviter);
                    const isMuted = session ? session.muted : false;
                    if (bot.inParty && !isMuted) {
                        const totalInvites = stats.totalInvites;
                        const totalGames = stats.totalGames;
                        const botHours = statsUtils.getBotUptime(bot.username);
                        const stayStatus = bot.stayMode ? translate(bot.currentLanguage, "enabled") : translate(bot.currentLanguage, "disabled");
                        const glStatus = bot.glEnabled ? translate(bot.currentLanguage, "enabled") : translate(bot.currentLanguage, "disabled");
                        const partyJoinMessage = translate(bot.currentLanguage, "party_join_message", totalInvites, totalGames, botHours);
                        bot.chat(`/party chat ${partyJoinMessage}`);
                        sendToWebhook(`🎉 **${bot.username}** joined the party of **${inviter}**. INFO: Invites: ${totalInvites} - Games: ${totalGames} - Hours: ${botHours} - Stay: ${stayStatus} - GL: ${glStatus}`);
                    } else if (bot.inParty && isMuted) {
                        const totalInvites = stats.totalInvites;
                        const totalGames = stats.totalGames;
                        const botHours = statsUtils.getBotUptime(bot.username);
                        const stayStatus = bot.stayMode ? translate(bot.currentLanguage, "enabled") : translate(bot.currentLanguage, "disabled");
                        const glStatus = bot.glEnabled ? translate(bot.currentLanguage, "enabled") : translate(bot.currentLanguage, "disabled");
                        sendToWebhook(`🎉 **${bot.username}** joined the party of **${inviter}** (bots muted). INFO: Invites: ${totalInvites} - Games: ${totalGames} - Hours: ${botHours} - Stay: ${stayStatus} - GL: ${glStatus}`);
                    }
                    sessionManager.addBot(inviter, bot);
                    setTimeout(() => {
                        sessionManager.assignHelpBot(inviter, bot, (key, ...a) => translate(bot.currentLanguage, key, ...a));
                    }, 2000);
                }, delay);
            }
        }

        if (msg.includes("you have joined") && msg.includes("party")) {
            const joinedMatch = raw.match(/You have joined (\w+)'s party!/);
            if (joinedMatch) {
                const inviter = joinedMatch[1];
                bot.invitedBy = inviter;
                bot.inParty = true;
                bot.joinedGame = false;
                bot.inLimbo = false;
                statsUtils.addInvite(bot.username);
                const stats = statsUtils.getGlobalStats();
                const totalInvites = stats.totalInvites;
                const totalGames = stats.totalGames;
                const stayStatus = bot.stayMode ? translate(bot.currentLanguage, "enabled") : translate(bot.currentLanguage, "disabled");
                const glStatus = bot.glEnabled ? translate(bot.currentLanguage, "enabled") : translate(bot.currentLanguage, "disabled");
                const botHours = statsUtils.getBotUptime(bot.username);

                sessionManager.addBot(inviter, bot);
                const session = sessionManager.getSession(inviter);
                const isMuted = session ? session.muted : false;

                if (!isMuted) {
                    const partyJoinMessage = translate(bot.currentLanguage, "party_join_message", totalInvites, totalGames, botHours);
                    bot.chat(`/party chat ${partyJoinMessage}`);
                    sendToWebhook(`🎉 **${bot.username}** joined the party of **${inviter}**. INFO: Invites: ${totalInvites} - Games: ${totalGames} - Hours: ${botHours} - Stay: ${stayStatus} - GL: ${glStatus}`);
                } else {
                    sendToWebhook(`🎉 **${bot.username}** joined the party of **${inviter}** (bots muted). INFO: Invites: ${totalInvites} - Games: ${totalGames} - Hours: ${botHours} - Stay: ${stayStatus} - GL: ${glStatus}`);
                }

                setTimeout(() => {
                    sessionManager.assignHelpBot(inviter, bot, (key, ...a) => translate(bot.currentLanguage, key, ...a));
                    // Start anti-idle timers once helpBot is elected
                    const s = sessionManager.getSession(inviter);
                    if (s && s.helpBot && s.helpBot.username === bot.username) {
                        sessionManager.startNoGameTimer(inviter, bot, translate, notifyQueuedUser);
                        sessionManager.startAbsoluteTimer(inviter, bot, translate, notifyQueuedUser);
                    }
                }, 2000);
            }
            lastInviteTime = Date.now();
            clearTimeout(initialLimboTimeout);
        }

        if (!sender && (msg.includes("summoned you to their server") || msg.includes("sending to server"))) {
            if (!bot.joinedGame) {
                bot.joinedGame = true;
                bot.inLimbo = false;
            }
        }

        if (!sender && msg.includes("we couldn't find a server")) {
            bot.joinedGame = false;
            bot.inLimbo = true;
        }

        // GAME STARTS
        if (!sender && msg.includes("the game starts in")) {
            if (!bot.joinedGame) {
                bot.joinedGame = true;
                bot.inLimbo = false;
            }
            // Cancelar timers anti-idle cuando el juego empieza de verdad
            const _partyKey = bot.invitedBy;
            if (_partyKey) {
                sessionManager.cancelIdleTimers(_partyKey);
            }
            const match = raw.match(/starts in (\d+) seconds?/i);
            if (match) {
                const seconds = parseInt(match[1]);

                if (bot.helpBot && bot.inParty) {
                    const partyLeader = bot.invitedBy;
                    const session = partyLeader ? sessionManager.getSession(partyLeader) : null;
                    if (session) {
                        if (session.leaveTimer) {
                            clearTimeout(session.leaveTimer);
                            session.leaveTimer = null;
                        }
                        const sessionMuted = session.muted;
                        if (!adminList.includes(partyLeader) && bot.stayMode && session.gamesStarted >= 3) {
                            console.log(`[SESSION] Party ${partyLeader} exceeded 3-game limit. Leaving.`);
                            if (!sessionMuted) bot.chat("/party chat ⏰ You've used all 3 games! Bots are leaving. Re-invite after 1 minute.");
                            setTimeout(() => {
                                sessionManager.evictAll(partyLeader, notifyQueuedUser);
                                inviteCooldowns[partyLeader] = { lastInviter: partyLeader, timestamp: Date.now() };
                            }, 2000);
                            return;
                        }
                        if (!adminList.includes(partyLeader) && bot.stayMode && session.gamesStarted === 2) {
                            if (!sessionMuted) bot.chat("/party chat ⚠️ Last game! Bots will leave after this one.");
                        }
                    }
                }

                if (bot.helpBot && !sessionManager.isMuted(bot.invitedBy)) {
                    const timeMessage = seconds === 1
                        ? translate(bot.currentLanguage, "game_start_countdown_one")
                        : translate(bot.currentLanguage, "game_start_countdown_multiple", seconds);
                    bot.chat(`/pc ${timeMessage}`);
                }

                if (seconds === 1) {
                    const partyLeader = bot.invitedBy || "unknown";
                    const session = partyLeader !== "unknown" ? sessionManager.getSession(partyLeader) : null;

                    if (bot.helpBot && bot.inParty && session) {
                        session.gamesStarted++;
                        sessionManager.cancelIdleTimers(partyLeader);
                        if (!adminList.includes(partyLeader) && bot.stayMode) {
                            console.log(`[SESSION] Setting 30s leave timer for ${partyLeader}.`);
                            session.leaveTimer = setTimeout(() => {
                                if (bot.inParty && bot.invitedBy === partyLeader) {
                                    if (!session.muted) bot.chat(`/party chat ${translate(bot.currentLanguage, "leave_warning_10s")}`);
                                    setTimeout(() => {
                                        if (bot.inParty && bot.invitedBy === partyLeader) {
                                            sessionManager.evictAll(partyLeader, notifyQueuedUser);
                                        }
                                    }, 10000);
                                }
                            }, 23000);
                        }
                    }

                    const now = Date.now();
                    if (!debouncedGames[partyLeader] || now - debouncedGames[partyLeader] > 10000) {
                        debouncedGames[partyLeader] = now;
                        statsUtils.addGame(bot.username);
                    }
                    setTimeout(() => {
                        if (bot.glEnabled && !sessionManager.isMuted(bot.invitedBy)) {
                            if (!recentGlMessages[partyLeader]) recentGlMessages[partyLeader] = [];
                            let availableMessages = glMessages.filter(m => !recentGlMessages[partyLeader].includes(m));
                            if (availableMessages.length === 0) {
                                availableMessages = glMessages;
                                recentGlMessages[partyLeader] = [];
                            }
                            const randomMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)];
                            recentGlMessages[partyLeader].push(randomMessage);
                            bot.chat(`/party chat ${randomMessage}`);
                            setTimeout(() => { delete recentGlMessages[partyLeader]; }, 5000);
                        }

                        setTimeout(() => {
                            if (!bot.stayMode) {
                                bot.chat("/party leave");
                                bot.chat("/limbo");
                                bot.inParty = false;
                                bot.joinedGame = false;
                                bot.inLimbo = true;
                            } else {
                                bot.chat("/limbo");
                                bot.joinedGame = false;
                                bot.inLimbo = true;
                                // Reset noGameTimer for next game in stay mode
                                const s = sessionManager.getSession(bot.invitedBy);
                                if (s && s._startNoGameTimer) s._startNoGameTimer();
                            }
                        }, 1500);
                    }, Math.floor(Math.random() * 500));
                }
            }
        }

        // Group 1 = who sent the invite (for /party accept)
        // Group 2 = actual party leader (only present in "join [RANK] X's party" format)
        const inviteMatch = raw.match(/(?:\[.*?\] )?(\w+) has invited you to join (?:their|(?:\[.*?\] )?(\w+)'s) party!/);
        if (inviteMatch) {
            const inviter = inviteMatch[1];
            // If someone invited the bot to another player's party, the leader is group 2
            const partyLeader = inviteMatch[2] || inviter;
            console.log(`[DEBUG ${bot.username}] Invite from: ${inviter}, Party leader: ${partyLeader}. Whitelisted: ${whitelist.includes(inviter)}`);
            if (!whitelist.includes(inviter)) return;

            if (bot.inParty) {
                let location = translate(bot.currentLanguage, "status_lobby");
                if (bot.joinedGame) location = translate(bot.currentLanguage, "status_ingame");
                else if (bot.inLimbo) location = translate(bot.currentLanguage, "status_limbo");

                const message = bot.joinedGame
                    ? translate(bot.currentLanguage, "status_ingame_wait")
                    : translate(bot.currentLanguage, "status_already_party", location);

                bot.chat(`/msg ${inviter} ${message}`);
                return;
            }

            inviteCooldowns[bot.username] = {
                lastInviter: inviter,
                timestamp: Date.now()
            };

            console.log(`[BOT ${index}] Accepting invite from ${inviter}`);
            bot.chat(`/party accept ${inviter}`);
            bot.inParty = true;
            bot.joinedGame = false;
            bot.inLimbo = false;
            lastInviteTime = Date.now();
            bot.invitedBy = partyLeader;
            statsUtils.addInvite(bot.username);
            sessionManager.addBot(partyLeader, bot);

            const delay = Math.floor(Math.random() * 1000) + 500;
            setTimeout(() => {
                const stats = statsUtils.getGlobalStats();
                const isMuted2 = sessionManager.isMuted(partyLeader);
                if (bot.inParty && !isMuted2) {
                    const totalInvites = stats.totalInvites;
                    const totalGames = stats.totalGames;
                    const botHours = statsUtils.getBotUptime(bot.username);
                    const stayStatus = bot.stayMode ? translate(bot.currentLanguage, "enabled") : translate(bot.currentLanguage, "disabled");
                    const glStatus = bot.glEnabled ? translate(bot.currentLanguage, "enabled") : translate(bot.currentLanguage, "disabled");
                    const partyJoinMessage = translate(bot.currentLanguage, "party_join_message", totalInvites, totalGames, botHours);
                    bot.chat(`/party chat ${partyJoinMessage}`);
                    sendToWebhook(`✅ **${bot.username}** was invited by **${inviter}** to **${partyLeader}'s** party. INFO: Invites: ${totalInvites} - Games: ${totalGames} - Hours: ${botHours} - Stay: ${stayStatus} - GL: ${glStatus}`);
                } else if (bot.inParty && isMuted2) {
                    const totalInvites = stats.totalInvites;
                    const totalGames = stats.totalGames;
                    const botHours = statsUtils.getBotUptime(bot.username);
                    const stayStatus = bot.stayMode ? translate(bot.currentLanguage, "enabled") : translate(bot.currentLanguage, "disabled");
                    const glStatus = bot.glEnabled ? translate(bot.currentLanguage, "enabled") : translate(bot.currentLanguage, "disabled");
                    sendToWebhook(`✅ **${bot.username}** was invited by **${inviter}** to **${partyLeader}'s** party (bots muted). INFO: Invites: ${totalInvites} - Games: ${totalGames} - Hours: ${botHours} - Stay: ${stayStatus} - GL: ${glStatus}`);
                }
            }, delay);

            // HelpBot assignment + anti-idle timers (all via sessionManager)
            setTimeout(() => {
                const elected = sessionManager.assignHelpBot(partyLeader, bot, (key, ...a) => translate(bot.currentLanguage, key, ...a));
                if (elected) {
                    sessionManager.startNoGameTimer(partyLeader, bot, translate, notifyQueuedUser);
                    sessionManager.startAbsoluteTimer(partyLeader, bot, translate, notifyQueuedUser);
                }
            }, 2000);
        }

        if (partyChatMatch && sender && !bots.some(b => b.username === sender)) {
            const command = partyChatMatch[2].trim().split(' ')[0];
            const leader = bot.invitedBy;
            const session = leader ? sessionManager.getSession(leader) : null;
            const sessionMuted = session ? session.muted : false;

            if (bot.helpBot && (!sessionMuted || command === "!unmute")) {
                const args = partyChatMatch[2].trim().substring(command.length).trim();

                if (commandHandlers[command]) {
                    const existingLeader = commandLeaders[leader];
                    const alreadyClaimed = existingLeader
                        && existingLeader.command === command
                        && existingLeader.leader !== bot.username
                        && Date.now() - existingLeader.timestamp < commandLeaderTimeout;

                    if (alreadyClaimed) {
                        console.log(`[COMMAND] Ignoring "${command}" — already handled by ${existingLeader.leader}.`);
                    } else {
                        commandLeaders[leader] = { command, leader: bot.username, timestamp: Date.now() };
                        console.log(`[COMMAND] "${command}" from ${sender} handled by ${bot.username}.`);
                        // setMuteState now updates the session instead of bot.muted
                        const setMuteState = (mute) => { if (session) sessionManager.setMuted(leader, mute); };
                        commandHandlers[command].module(bot, raw, args, sender, adminList, setMuteState, whitelist, translate, sendToWebhook, sessionManager.getSessions(), fs, path, reloadConfigs, bots, () => {});
                    }
                } else if (autoResponses[command] && !sessionMuted && bot.helpBot) {
                    const response = translate(bot.currentLanguage, autoResponses[command], args);
                    bot.chat(`/party chat ${response}`);
                }
            }
        }

        const _autoSession = bot.invitedBy ? sessionManager.getSession(bot.invitedBy) : null;
        if (!raw.startsWith("Party >") && !raw.startsWith("From") && autoResponses[msg] && !(_autoSession && _autoSession.muted) && bot.helpBot) {
            bot.chat(autoResponses[msg]);
        }

        const dmMatch = raw.match(/^From (?:\[.*?\] )?(\w+): (.+)/);
        if (dmMatch) {
            const sender = dmMatch[1];
            const content = dmMatch[2].trim();
            sendToDMWebhook(`📨 **${sender} ➜ ${bot.username}**: ${content}`);

            // Detectar error de Hypixel al intentar enviar DM (DMs desactivados)
            // Ejemplo: "You can only private message players who are on your friend list."
            // Esta línea viene como un mensaje From del sistema, no coincidirá con el patrón normal,
            // pero la capturamos aquí si algún bot tiene un pending de notificación.

            // --- Comandos admin por DM: !add y !remove ---
            if (adminList.includes(sender)) {
                const dmCmd = content.split(' ')[0];
                const dmArgs = content.substring(dmCmd.length).trim();
                if (dmCmd === '!add' && commandHandlers['!add']) {
                    // Solo un bot ejecuta el comando (el primero que lo procese)
                    // Usamos un pequeño mutex basado en timestamp
                    if (!global._lastDMCmdTime || Date.now() - global._lastDMCmdTime > 500) {
                        global._lastDMCmdTime = Date.now();
                        commandHandlers['!add'].module(bot, raw, dmArgs, sender, adminList, (m) => { if (bot.invitedBy) sessionManager.setMuted(bot.invitedBy, m); }, whitelist, translate, sendToWebhook, sessionManager.getSessions(), fs, path, reloadConfigs, bots, () => {});
                    }
                    return;
                }
                if (dmCmd === '!remove' && commandHandlers['!remove']) {
                    if (!global._lastDMCmdTime || Date.now() - global._lastDMCmdTime > 500) {
                        global._lastDMCmdTime = Date.now();
                        commandHandlers['!remove'].module(bot, raw, dmArgs, sender, adminList, (m) => { if (bot.invitedBy) sessionManager.setMuted(bot.invitedBy, m); }, whitelist, translate, sendToWebhook, sessionManager.getSessions(), fs, path, reloadConfigs, bots, () => {});
                    }
                    return;
                }
            }

            // --- !queue por DM para usuarios whitelisted ---
            if (whitelist.includes(sender) && content.trim() === '!queue') {
                const botsInStay = bots.filter(b => b.inParty && b.stayMode);
                if (botsInStay.length === 0) {
                    // No hay bots ocupados con stayMode, están libres
                    bot.chat(`/msg ${sender} ✅ All bots are currently free! Just invite them.`);
                } else {
                    const wasAdded = queueManager.addToQueue(sender, bot);
                    const pos = queueManager.getPosition(sender);
                    if (wasAdded) {
                        bot.chat(`/msg ${sender} 📋 Added to queue! You are #${pos} in line. We'll notify you when a bot is free.`);
                    } else {
                        bot.chat(`/msg ${sender} ℹ️ You're already in queue at position #${pos}.`);
                    }
                }
                return;
            }

            // --- !status por DM para whitelist (comportamiento existente) ---
            if (whitelist.includes(sender) && commandHandlers["!status"]) {
                commandHandlers["!status"].module(bot, raw, "", sender, adminList, bot.invitedBy ? sessionManager.isMuted(bot.invitedBy) : false, whitelist, translate, sendToWebhook, sessionManager.getSessions(), fs, path, reloadConfigs, bots);
            }
        }

        // Detectar mensaje de error de Hypixel: DMs desactivados del usuario en cola
        if (raw.includes("You can only private message players who are on your friend list")) {
            // Buscar si este bot tenía una notificación pendiente
            if (pendingDMNotifications[bot.username]) {
                const { queuedUser, originalBot } = pendingDMNotifications[bot.username];
                delete pendingDMNotifications[bot.username];
                // Fallback: el bot original manda el aviso
                if (originalBot && originalBot !== bot) {
                    try {
                        originalBot.chat(`/msg ${queuedUser} 🔔 A bot (${bot.username}) is now free! Invite them to play.`);
                    } catch (e) {
                        console.error(`[QUEUE] Fallback DM also failed for ${queuedUser}:`, e);
                    }
                }
            }
        }

        const partyMessages = {};
        if (partyChatMatch) {
            const sender = partyChatMatch[1];
            const content = partyChatMatch[2].trim();
            if (!partyMessages[sender]) {
                partyMessages[sender] = [];
            }
            partyMessages[sender].push({ content, timestamp: Date.now() });
            partyMessages[sender] = partyMessages[sender].filter(m => Date.now() - m.timestamp < 3000);
            if (partyMessages[sender].length > 3 && !bot.muted && bot.helpBot) {
                bot.chat(`/party chat ${translate(bot.currentLanguage, "spam_warning")}`);
            }
        }
    });

    bot.on("kicked", (reason) => {
        console.log(`[BOT ${index}] Kicked: ${reason}`);
        sendToWebhook(`❌ **${bot.username}** was kicked: ${reason}`);
        const botIndex = bots.indexOf(bot);
        if (botIndex > -1) bots.splice(botIndex, 1);
        const _leader = bot.invitedBy;
        if (_leader) sessionManager.removeBot(_leader, bot, bots, notifyQueuedUser, translate);
        else { bot.inParty = false; bot.helpBot = false; bot.isDesignatedHelpBot = false; bot.invitedBy = null; }
        setTimeout(() => { createBot({ username: bot.username, language: bot.currentLanguage }, index); }, 5000);
    });

    bot.on("end", (reason) => {
        console.log(`[BOT ${index}] Disconnected: ${reason}`);
        sendToWebhook(`🔌 **${bot.username}** disconnected: ${reason}`);
        const botIndex = bots.indexOf(bot);
        if (botIndex > -1) bots.splice(botIndex, 1);
        const _leader = bot.invitedBy;
        if (_leader) sessionManager.removeBot(_leader, bot, bots, notifyQueuedUser, translate);
        else { bot.inParty = false; bot.helpBot = false; bot.isDesignatedHelpBot = false; bot.invitedBy = null; }
        console.log(`[BOT ${index}] Reconnecting in 5s...`);
        setTimeout(() => { createBot({ username: bot.username, language: bot.currentLanguage }, index); }, 5000);
    });

    bot.on('error', err => {
        console.error(`[BOT ${index}] Error:`, err);
        sendToDMWebhook(`🚨 **${bot.username}** encountered an error: ${err}`);
        const botIndex = bots.indexOf(bot);
        if (botIndex > -1) bots.splice(botIndex, 1);
        const _leader = bot.invitedBy;
        if (_leader) sessionManager.removeBot(_leader, bot, bots, notifyQueuedUser, translate);
        else { bot.inParty = false; bot.helpBot = false; bot.isDesignatedHelpBot = false; bot.invitedBy = null; }
        console.log(`[BOT ${index}] Reconnecting in 10s...`);
        setTimeout(() => { createBot({ username: bot.username, language: bot.currentLanguage }, index); }, 10000);
    });

    return bot;
}

setInterval(() => {
    const statesToSave = {};
    bots.forEach(bot => {
        statesToSave[bot.username] = {
            stayMode: bot.stayMode,
            glEnabled: bot.glEnabled,
            language: bot.currentLanguage
        };
    });
    saveBotStates(statesToSave);
}, 300000);

setInterval(() => {
    bots.forEach(bot => {
        if (bot && bot.username) {
            statsUtils.addUptime(bot.username, 1);
        }
    });
}, 60000);

setInterval(() => {
    const now = new Date();
    const backupPath = path.join(__dirname, `../bots/invitationCounts_backup_${now.toISOString().replace(/:/g, '-')}.json`);
    fs.copyFileSync(statsUtils.invitationCountsPath, backupPath);
    console.log(`[BACKUP] Created backup of invitationCounts.json at ${now.toISOString()}`);
}, 3600000);

module.exports = {
    createBot,
};