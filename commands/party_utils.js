const { loadUserLanguages } = require('../utils/userLanguageUtils');

module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots) => {
    if (!whitelist.includes(sender)) return;

    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...args) => translateOriginal(userLanguage, key, ...args);

    // Parse command again since it's shared
    const raw = msg.toString().replace(/\n/g, " ");
    const partyChatMatch = raw.match(/^Party > (?:\[.*?\] )?(\w+): (!\w+)/);
    if (!partyChatMatch) return;
    const command = partyChatMatch[2].toLowerCase();

    if (command === "!leave") {
        bot.chat("/party leave");
    } else if (command === "!disband") {
        bot.chat("/party disband");
    } else if (command === "!warp") {
        bot.chat("/party warp");
    } else if (command === "!promote") {
        if (args) {
            bot.chat(`/party promote ${args}`);
        } else {
            bot.chat(`/party promote ${sender}`);
        }
    }
};
