const { loadUserLanguages } = require('../utils/userLanguageUtils'); // Importa la función para cargar los idiomas de usuario

module.exports = (bot, msg, args, sender, adminList, botsMutedCallback, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots) => {
    // Verificar si este bot es el 'helpBot'
    const isHelpBot = bots.some(b => b.username === bot.username && b.helpBot);

    if (!isHelpBot) {
        return; // Si no es el helpBot, no ejecuta el comando
    }

    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...innerArgs) => translateOriginal(userLanguage, key, ...innerArgs);

    const botPartyLeader = Object.keys(activeParties).find(leader => activeParties[leader]?.bots?.some(b => b.username === bot.username));

    // Mute solo a los bots en la misma party
    for (const aBot of bots) {
        const otherBotPartyLeader = Object.keys(activeParties).find(leader => activeParties[leader]?.bots?.some(b => b.username === aBot.username));
        if (otherBotPartyLeader === botPartyLeader) {
            aBot.muted = true;
            console.log(`[MUTE] Muted ${aBot.username} in party of ${botPartyLeader}`);
        }
    }

    bot.chat(`/party chat ${translate("party_bots_muted")}`);
    sendToWebhook(translate("party_bots_muted_webhook", sender));
};