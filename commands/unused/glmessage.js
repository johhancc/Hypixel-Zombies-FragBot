const fs = require('fs');
const path = require('path');
const { loadUserLanguages } = require('../utils/userLanguageUtils'); // Importa la función para cargar los idiomas de usuario
const glMessages = require('../data/glMessages.json'); // Importa la lista actual de mensajes GL

module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translateOriginal, sendToWebhook, activeParties, currentFs, currentPath, reload, bots) => {
    // Verificar si este bot es el 'helpBot'
    const isHelpBot = bots.some(b => b.username === bot.username && b.helpBot);

    if (!isHelpBot) {
        return; // Si no es el helpBot, no ejecuta el comando
    }

    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...innerArgs) => translateOriginal(userLanguage, key, ...innerArgs);

    const botPartyLeader = Object.keys(activeParties).find(leader => activeParties[leader]?.bots?.some(b => b.username === bot.username));
    const isAllowedSender = botPartyLeader ? activeParties[botPartyLeader]?.bots?.some(b => b.username === sender) || botPartyLeader === sender : true; // Allow if leader or in the party

    if (!adminList.includes(sender)) {
        bot.chat(`/party chat ${translate("no_permission")}`);
        return;
    }

    const newGlMessage = args ? args.trim() : null;
    if (newGlMessage) {
        glMessages.push(newGlMessage);
        try {
            fs.writeFileSync(path.join(__dirname, '../data/glMessages.json'), JSON.stringify(glMessages, null, 2));
            bot.chat(`/party chat ${translate("glmessage_added", newGlMessage)}`);
        } catch (error) {
            console.error("Error writing to glMessages.json:", error);
            bot.chat(`/party chat ${translate("glmessage_error", error.message)}`);
            sendToWebhook(`⚠️ Error writing to glMessages.json: ${error.message}`);
        }
    } else {
        bot.chat(`/party chat ${translate("glmessage_usage")}`);
    }
};