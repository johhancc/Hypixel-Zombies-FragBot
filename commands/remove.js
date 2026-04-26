const fs = require('fs');
const path = require('path');
const { loadUserLanguages } = require('../utils/userLanguageUtils');

module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translateOriginal, sendToWebhook, activeParties, currentFs, currentPath, reload, bots) => {
    const isDM = msg.startsWith("From ");

    // Si es DM, cualquier bot puede ejecutarlo (no requiere helpBot).
    // Si es party chat, solo el helpBot lo ejecuta.
    if (!isDM) {
        const isHelpBot = bots.some(b => b.username === bot.username && b.helpBot);
        if (!isHelpBot) return;
    }

    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...innerArgs) => translateOriginal(userLanguage, key, ...innerArgs);

    const reply = (message) => {
        if (isDM) {
            bot.chat(`/msg ${sender} ${message}`);
        } else {
            bot.chat(`/party chat ${message}`);
        }
    };

    if (!adminList.includes(sender)) {
        reply(translate("no_permission"));
        return;
    }

    const nameToRemove = args ? args.trim() : null;
    if (nameToRemove) {
        const index = whitelist.indexOf(nameToRemove);
        if (index > -1) {
            whitelist.splice(index, 1);
            try {
                fs.writeFileSync(path.join(__dirname, '../admin/whitelist.json'), JSON.stringify(whitelist, null, 2));
                reload();
                reply(translate("remove_whitelist_success", nameToRemove));
                sendToWebhook(translate("remove_whitelist_webhook", sender, nameToRemove));
            } catch (error) {
                console.error("Error writing to whitelist.json:", error);
                reply(translate("remove_whitelist_error", nameToRemove, error.message));
                sendToWebhook(translate("remove_whitelist_error_webhook", error.message));
            }
        } else {
            reply(translate("remove_whitelist_not_exists", nameToRemove));
        }
    } else {
        reply(translate("remove_whitelist_usage"));
    }
};