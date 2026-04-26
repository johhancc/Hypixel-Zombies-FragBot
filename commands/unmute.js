const { loadUserLanguages } = require('../utils/userLanguageUtils');

module.exports = (bot, msg, args, sender, adminList, setMuteState, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots) => {
    // Basic permission check
    if (!whitelist.includes(sender)) {
        return;
    }

    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...innerArgs) => translateOriginal(userLanguage, key, ...innerArgs);

    // Call the callback to set mute state to false
    if (typeof setMuteState === 'function') {
        setMuteState(false);
        bot.chat(`/party chat ${translate("party_bots_unmuted")}`);
        sendToWebhook(translate("party_bots_unmuted_webhook", sender));
    } else {
        console.error("setMuteState callback provided to !unmute command is not a function.");
    }
};
