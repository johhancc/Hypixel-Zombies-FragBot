const { loadUserLanguages } = require('../utils/userLanguageUtils');

// Cooldown en milisegundos
const cooldown = 5000;
const lastUsage = {};

module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots, setLeader) => {
    if (lastUsage[sender] && Date.now() - lastUsage[sender] < cooldown) {
        const remainingTime = Math.ceil((cooldown - (Date.now() - lastUsage[sender])) / 1000);
        bot.chat(`/party chat ${translateOriginal(bot.currentLanguage, "command_cooldown", remainingTime)}`);
        return;
    }

    const isHelpBot = bots.some(b => b.username === bot.username && b.helpBot);
    if (!isHelpBot) return;

    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...innerArgs) => translateOriginal(userLanguage, key, ...innerArgs);

    let activeBots = bots.filter(b => b.username).map(b => b.username);
    let inPartyBots = bots.filter(b => b.inParty).map(b => b.username);
    let inLimboBots = bots.filter(b => b.inLimbo).map(b => b.username);
    let inGameBots = bots.filter(b => b.joinedGame).map(b => b.username);

    bot.chat(`/party chat ${translate("bots_status", activeBots.length, inPartyBots.length, inLimboBots.length, inGameBots.length)}`);
    lastUsage[sender] = Date.now();
    setLeader(true); // Designar a este bot como líder para este comando
};

module.exports.needsLeader = true; // Indica que solo un bot debería responder