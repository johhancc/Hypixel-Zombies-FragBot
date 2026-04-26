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

    if (!args) {
        reply(translate("add_whitelist_usage"));
        return;
    }

    const usernameToAdd = args.trim();
    if (whitelist.includes(usernameToAdd)) {
        reply(translate("add_whitelist_exists", usernameToAdd));
        return;
    }

    whitelist.push(usernameToAdd);
    try {
        fs.writeFileSync(path.join(__dirname, '../admin/whitelist.json'), JSON.stringify(whitelist, null, 2));
        reload();
        reply(translate("add_whitelist_success", usernameToAdd));
        sendToWebhook(translate("add_whitelist_webhook", sender, usernameToAdd));
    } catch (error) {
        console.error("Error writing to whitelist.json:", error);
        reply(translate("add_error", error.message));
        sendToWebhook(translate("remove_whitelist_error_webhook", error.message));
    }
};