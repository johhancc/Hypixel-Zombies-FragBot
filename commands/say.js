const { loadUserLanguages } = require('../utils/userLanguageUtils'); // Importa la función para cargar los idiomas de usuario

module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots) => {
    // Verificar si este bot es el 'helpBot'
    const isHelpBot = bots.some(b => b.username === bot.username && b.helpBot);

    if (!isHelpBot) {
        return; // Si no es el helpBot, no ejecuta el comando
    }

    if (!activeParties) {
        console.error("[ERROR] activeParties is undefined in say.js");
        // const userLanguages = loadUserLanguages();
        // const userLanguage = userLanguages[sender] || bot.currentLanguage;
        // const translate = (key, ...innerArgs) => translateOriginal(userLanguage, key, ...innerArgs);
        bot.chat(`/party chat ${translate("error_active_parties")}`);
        return;
    }

    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...innerArgs) => translateOriginal(userLanguage, key, ...innerArgs);

    // const botPartyLeader = Object.keys(activeParties).find(leader => activeParties[leader]?.bots?.some(b => b.username === bot.username));
    // const isAllowedSender = botPartyLeader ? activeParties[botPartyLeader]?.bots?.some(b => b.username === sender) || botPartyLeader === sender : true;

    // Opcional: Restringir el comando solo a miembros de la party
    // if (!isAllowedSender) {
    //     console.log(`[SAY] Command denied for ${sender} - not in the same party.`);
    //     bot.chat(`/party chat ${translate("no_permission")}`); // Asegúrate de tener esta traducción
    //     return;
    // }

    const messageToSay = args ? args.trim() : null;

    // Log para depuración: verifica si esta línea se está ejecutando y el valor de messageToSay
    console.log(`[SAY] Received command from ${sender} (Bot: ${bot.username}), Message: "${messageToSay}", botsMuted: ${botsMuted}`);

    if (messageToSay && !botsMuted) {
        bot.chat(`/party chat ${messageToSay}`);
    } else if (!messageToSay) {
        bot.chat(`/party chat ${translate("say_usage")}`);
    } else if (botsMuted) {
        bot.chat(`/party chat ${translate("bots_are_muted")}`); // Opcional: Informar que los bots están muteados
    }
};