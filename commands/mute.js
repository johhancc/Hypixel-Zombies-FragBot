const { loadUserLanguages } = require('../utils/userLanguageUtils');

module.exports = (bot, msg, args, sender, adminList, setMuteState, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots) => {
    // Basic permission check (whitelist or admin)
    if (!whitelist.includes(sender)) {
        return;
    }

    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...innerArgs) => translateOriginal(userLanguage, key, ...innerArgs);

    // Call the callback to set mute state to true
    if (typeof setMuteState === 'function') {
        setMuteState(true);
        bot.chat(`/party chat ${translate("party_bots_muted")}`);
        sendToWebhook(translate("party_bots_muted_webhook", sender));

        // Si el usuario NO es admin, avisar del límite de 3 juegos / 30s (solo si stayMode activo)
        if (!adminList.includes(sender) && bots && bots.some(b => b.stayMode)) {
            setTimeout(() => {
                bot.chat(`/party chat ${translate("stay_limit_info")}`);
            }, 400);
        }
    } else {
        console.error("setMuteState callback provided to !mute command is not a function.");
    }
};
