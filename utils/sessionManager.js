/**
 * sessionManager.js
 * ─────────────────────────────────────────────────────────────
 * Central source of truth for all active party sessions.
 * A session = one active Hypixel party, keyed by the leader's username.
 *
 * Each session tracks:
 *  - Which bots are in the party
 *  - Which bot is the helpBot (command responder)
 *  - Party-level mute state (replaces per-bot mute)
 *  - All timers (leave, noGame, absoluteParty)
 *  - Game count for stay-mode limits
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

/**
 * @typedef {Object} Session
 * @property {string}  leader
 * @property {Map<string, object>} members   username → mineflayer bot instance
 * @property {object|null} helpBot           bot instance currently acting as helpBot
 * @property {boolean} muted                 party-level mute (all bots obey this)
 * @property {number}  gamesStarted
 * @property {number}  partyStartTime        Date.now() when session was created
 * @property {ReturnType<setTimeout>|null} leaveTimer
 * @property {ReturnType<setTimeout>|null} noGameTimer
 * @property {ReturnType<setTimeout>|null} absolutePartyTimer
 * @property {Function|null} _startNoGameTimer  internal ref to reset noGameTimer
 */

/** @type {Map<string, Session>} */
const sessions = new Map();

// ─── Internal helpers ────────────────────────────────────────────────────────

function _clearTimer(session, key) {
    if (session[key]) {
        clearTimeout(session[key]);
        session[key] = null;
    }
}

function _clearAllTimers(session) {
    _clearTimer(session, 'leaveTimer');
    _clearTimer(session, 'noGameTimer');
    _clearTimer(session, 'absolutePartyTimer');
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a new session for the given leader (idempotent — does nothing if it
 * already exists).
 * @param {string} leader
 * @returns {Session}
 */
function createSession(leader) {
    if (!sessions.has(leader)) {
        sessions.set(leader, {
            leader,
            members: new Map(),
            helpBot: null,
            muted: false,
            gamesStarted: 0,
            partyStartTime: Date.now(),
            leaveTimer: null,
            noGameTimer: null,
            absolutePartyTimer: null,
            _startNoGameTimer: null,
        });
        console.log(`[SESSION] Created session for party leader: ${leader}`);
    }
    return sessions.get(leader);
}

/**
 * Returns the session for `leader`, or null if it doesn't exist.
 * @param {string} leader
 * @returns {Session|null}
 */
function getSession(leader) {
    return sessions.get(leader) || null;
}

/**
 * Returns all active sessions as a plain object (leader → session).
 * Used by commands that need to inspect all parties.
 * @returns {Object}
 */
function getSessions() {
    const result = {};
    for (const [leader, session] of sessions) {
        result[leader] = session;
    }
    return result;
}

/**
 * Destroy a session: cancel all timers and remove it from the map.
 * @param {string} leader
 */
function destroySession(leader) {
    const session = sessions.get(leader);
    if (!session) return;
    _clearAllTimers(session);
    sessions.delete(leader);
    console.log(`[SESSION] Destroyed session for party leader: ${leader}`);
}

/**
 * Add a bot to a session.
 * Creates the session if it doesn't exist yet.
 * Does NOT assign the helpBot here — call assignHelpBot() separately after a
 * small delay so all bots have had time to join.
 *
 * @param {string} leader
 * @param {object} bot  mineflayer bot instance
 * @returns {Session}
 */
function addBot(leader, bot) {
    const session = createSession(leader);
    if (!session.members.has(bot.username)) {
        bot._joinedAt = Date.now(); // timestamp used for helpBot election
        session.members.set(bot.username, bot);
        console.log(`[SESSION] ${bot.username} joined session of ${leader} (total: ${session.members.size})`);
    }
    return session;
}

/**
 * Assign the helpBot for a session atomically (mutex-safe within the JS event
 * loop). The bot with the earliest _joinedAt timestamp wins.
 *
 * Call this from a setTimeout ~2000 ms after addBot() so that all bots that
 * are joining at roughly the same time have already been added.
 *
 * @param {string} leader
 * @param {object} bot          the bot calling assignHelpBot (only it can win)
 * @param {Function} translate  the translate function for the bot's language
 * @returns {boolean}  true if this bot was elected helpBot
 */
function assignHelpBot(leader, bot, translate) {
    const session = sessions.get(leader);
    if (!session) return false;
    if (!bot.inParty || bot.invitedBy !== leader) return false;
    if (session.helpBot !== null) return false; // already assigned

    // Election: pick bot with lowest _joinedAt among current members
    let earliest = null;
    for (const [, member] of session.members) {
        if (!earliest || member._joinedAt < earliest._joinedAt) {
            earliest = member;
        }
    }

    if (!earliest || earliest.username !== bot.username) return false;

    // Claim the role IMMEDIATELY (before any async work)
    session.helpBot = bot;
    bot.helpBot = true;
    bot.isDesignatedHelpBot = true;

    console.log(`[SESSION] ${bot.username} elected as helpBot for ${leader}`);
    bot.chat('/party chat 🎤 I\'m now responding to commands.');

    setTimeout(() => {
        if (bot.inParty && bot.invitedBy === leader) {
            const stayStatus  = bot.stayMode ? translate('enabled') : translate('disabled');
            const muteStatus  = session.muted   ? translate('enabled') : translate('disabled');
            bot.chat(`/party chat ${translate('party_join_stay_mode', stayStatus, muteStatus)}`);
        }
    }, 500);

    return true;
}

/**
 * Remove a bot from a session.
 *
 * If the removed bot was the helpBot, elect a new one from the remaining
 * members and announce it in party chat.
 *
 * If the session becomes empty, destroy it and call notifyQueuedUser().
 *
 * @param {string}   leader
 * @param {object}   bot
 * @param {object[]} allBots         full `bots` array (for allBots.forEach)
 * @param {Function} notifyQueue     callback fired when session becomes empty
 * @param {Function} translate       translate(lang, key, ...args)
 */
function removeBot(leader, bot, allBots, notifyQueue, translate) {
    const session = sessions.get(leader);
    if (!session) return;

    const wasHelpBot = session.helpBot && session.helpBot.username === bot.username;
    session.members.delete(bot.username);

    // Reset bot's party state
    bot.inParty         = false;
    bot.helpBot         = false;
    bot.isDesignatedHelpBot = false;
    bot.joinedGame      = false;
    bot.inLimbo         = false;
    bot.invitedBy       = null;

    console.log(`[SESSION] ${bot.username} left session of ${leader} (remaining: ${session.members.size})`);

    if (session.members.size === 0) {
        destroySession(leader);
        notifyQueue();
        return;
    }

    if (wasHelpBot) {
        session.helpBot = null;
        // Elect the next oldest member as helpBot
        let next = null;
        for (const [, member] of session.members) {
            if (member.inParty && member.invitedBy === leader) {
                if (!next || member._joinedAt < next._joinedAt) {
                    next = member;
                }
            }
        }
        if (next) {
            session.helpBot = next;
            next.helpBot = true;
            next.isDesignatedHelpBot = true;
            console.log(`[SESSION] ${next.username} promoted to helpBot for ${leader} (previous helpBot left)`);
            next.chat('/party chat 🎤 I\'m now responding to commands. (Previous bot left)');

            setTimeout(() => {
                if (next.inParty && next.invitedBy === leader) {
                    const lang = next.currentLanguage;
                    const stayStatus = next.stayMode ? translate(lang, 'enabled') : translate(lang, 'disabled');
                    const muteStatus = session.muted  ? translate(lang, 'enabled') : translate(lang, 'disabled');
                    next.chat(`/party chat ${translate(lang, 'party_join_stay_mode', stayStatus, muteStatus)}`);
                }
            }, 500);
        }
    }
}

/**
 * Evict ALL bots from a session (e.g. when a party disbands or the user trolled).
 * Each bot executes /party leave and goes to limbo.
 *
 * @param {string}   leader
 * @param {Function} notifyQueue  fired after all bots leave
 */
function evictAll(leader, notifyQueue) {
    const session = sessions.get(leader);
    if (!session) return;

    for (const [, bot] of session.members) {
        try {
            bot.chat('/party leave');
            bot.chat('/limbo');
        } catch (_) { /* bot might be disconnected */ }
        bot.inParty         = false;
        bot.helpBot         = false;
        bot.isDesignatedHelpBot = false;
        bot.joinedGame      = false;
        bot.inLimbo         = true;
        bot.stayMode        = false;
        bot.invitedBy       = null;
    }

    destroySession(leader);
    notifyQueue();
}

/**
 * Set or clear the party-level mute for a session.
 * @param {string}  leader
 * @param {boolean} muted
 */
function setMuted(leader, muted) {
    const session = sessions.get(leader);
    if (session) session.muted = muted;
}

/**
 * Returns true if the session exists and is muted.
 * @param {string} leader
 * @returns {boolean}
 */
function isMuted(leader) {
    return sessions.get(leader)?.muted === true;
}

/**
 * Cancel all anti-idle timers for a session (called when a game starts).
 * @param {string} leader
 */
function cancelIdleTimers(leader) {
    const session = sessions.get(leader);
    if (!session) return;
    _clearTimer(session, 'noGameTimer');
    _clearTimer(session, 'absolutePartyTimer');
}

/**
 * Start (or restart) the 20-second no-game timer for a session.
 * Stored on the session so it can be reset after each game in stay mode.
 *
 * @param {string}   leader
 * @param {object}   helpBot      the bot that will announce & execute the leave
 * @param {Function} translate
 * @param {Function} notifyQueue
 */
function startNoGameTimer(leader, helpBot, translate, notifyQueue) {
    const session = sessions.get(leader);
    if (!session) return;

    _clearTimer(session, 'noGameTimer');

    // Store a reference so stay-mode can reset it after each game
    session._startNoGameTimer = () => startNoGameTimer(leader, helpBot, translate, notifyQueue);

    session.noGameTimer = setTimeout(() => {
        const s = sessions.get(leader);
        if (!s || s.gamesStarted > 0) return;
        if (!helpBot.inParty || helpBot.invitedBy !== leader) return;

        console.log(`[SESSION] noGameTimer (20 s) expired for ${leader}. Bots leaving.`);
        if (!s.muted) {
            helpBot.chat(`/party chat ${translate(helpBot.currentLanguage, 'no_game_start_warning')}`);
        }

        setTimeout(() => {
            const s2 = sessions.get(leader);
            if (!s2 || s2.gamesStarted > 0) return;
            evictAll(leader, notifyQueue);
        }, 10000);
    }, 20000);
}

/**
 * Start the 60-second absolute anti-troll timer (created once per session).
 *
 * @param {string}   leader
 * @param {object}   helpBot
 * @param {Function} translate
 * @param {Function} notifyQueue
 */
function startAbsoluteTimer(leader, helpBot, translate, notifyQueue) {
    const session = sessions.get(leader);
    if (!session || session.absolutePartyTimer) return; // already running

    session.absolutePartyTimer = setTimeout(() => {
        const s = sessions.get(leader);
        if (!s || s.gamesStarted > 0) return;
        if (!helpBot.inParty || helpBot.invitedBy !== leader) return;

        console.log(`[SESSION] absolutePartyTimer (60 s) expired for ${leader}. No game started.`);
        if (!s.muted) {
            helpBot.chat(`/party chat ${translate(helpBot.currentLanguage, 'no_game_found_timeout')}`);
        }

        setTimeout(() => {
            const s2 = sessions.get(leader);
            if (!s2 || s2.gamesStarted > 0) return;
            evictAll(leader, notifyQueue);
        }, 10000);
    }, 60000);
}

module.exports = {
    createSession,
    getSession,
    getSessions,
    destroySession,
    addBot,
    assignHelpBot,
    removeBot,
    evictAll,
    setMuted,
    isMuted,
    cancelIdleTimers,
    startNoGameTimer,
    startAbsoluteTimer,
};
