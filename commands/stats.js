const { loadUserLanguages } = require('../utils/userLanguageUtils');
const statsUtils = require('../utils/statsUtils');

module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots) => {
    // Verificar si este bot es el 'helpBot'
    const isHelpBot = Array.isArray(bots) && bots.some(b => b.username === bot.username && b.helpBot);

    if (!isHelpBot) {
        return; // Si no es el helpBot, no ejecuta el comando
    }

    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...innerArgs) => translateOriginal(userLanguage, key, ...innerArgs);

    const botPartyLeader = Object.keys(activeParties).find(leader => activeParties[leader]?.bots?.some(b => b.username === bot.username));
    const isAllowedSender = botPartyLeader ? activeParties[botPartyLeader]?.bots?.some(b => b.username === sender) || botPartyLeader === sender : true; // Allow if leader or in the party

    const stats = statsUtils.getGlobalStats();
    const totalInvites = stats.totalInvites;
    const totalGames = stats.totalGames;
    const stayStatus = Array.isArray(bots) && bots.length > 0 ? (bots.find(b => b.username === bot.username)?.stayMode ? translate("enabled") : translate("disabled")) : translate("disabled");
    const glStatus = Array.isArray(bots) && bots.length > 0 ? (bots.find(b => b.username === bot.username)?.glEnabled ? translate("enabled") : translate("disabled")) : translate("disabled");

    console.log(`[STATS] Sending stats message in party chat as ${bot.username}: Invites=${totalInvites}, Games=${totalGames}, Stay=${stayStatus}, GL=${glStatus}`);

    bot.chat(`/party chat ${translate("stats_message", totalInvites, totalGames, stayStatus, glStatus)}`);
};