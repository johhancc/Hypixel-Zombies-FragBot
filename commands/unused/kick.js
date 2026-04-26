const { loadUserLanguages } = require('../utils/userLanguageUtils'); // Importa la función para cargar los idiomas de usuario

module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots) => {
    // Verificar si este bot es el 'helpBot'
    const isHelpBot = bots.some(b => b.username === bot.username && b.helpBot);

    if (!isHelpBot) {
        return; // Si no es el helpBot, no ejecuta el comando
    }

    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...innerArgs) => translateOriginal(userLanguage, key, ...innerArgs);

    const botPartyLeader = Object.keys(activeParties).find(leader => activeParties[leader]?.bots?.some(b => b.username === bot.username));

    if (!args) {
        bot.chat(`/party chat ${translate("kick_usage")}`);
        return;
    }

    const target = args.trim();
    const botToKick = bots.find(b => b.username.toLowerCase() === target.toLowerCase());

    // Only allow kicking bots within the same party
    if (botToKick) {
        const targetBotPartyLeader = Object.keys(activeParties).find(leader => {
            const partyMembers = activeParties[leader]?.bots?.map(b => b.username);
            return Array.isArray(partyMembers) && partyMembers?.includes(botToKick.username);
        });
        if (botPartyLeader === targetBotPartyLeader && botPartyLeader !== undefined) {
            bot.chat(`/party kick ${target}`);
            bot.chat(`/party chat ${translate("kick_success", target)}`);
            sendToWebhook(translate("kick_webhook", sender, target)); // Assuming you have a "kick_webhook" translation
        } else {
            bot.chat(`/party chat ${translate("kick_not_same_party", target)}`);
        }
    } else {
        bot.chat(`/party chat ${translate("kick_not_found", target)}`);
    }
};