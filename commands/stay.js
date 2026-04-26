const { loadUserLanguages } = require('../utils/userLanguageUtils');

module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots) => {
    // Verificar si este bot es el 'helpBot'
    const isHelpBot = bots.some(b => b.username === bot.username && b.helpBot);

    if (!isHelpBot) {
        return; // Si no es el helpBot, no ejecuta el comando
    }

    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...innerArgs) => translateOriginal(userLanguage, key, ...innerArgs);

    if (!whitelist.includes(sender)) {
        bot.chat(`/party chat ${translate("no_permission")}`);
        return;
    }

    if (!bots || bots.length === 0) {
        bot.chat(`/party chat ${translate("no_bots_online")}`);
        return;
    }

    let newStay;

    if (args === 'on') {
        newStay = true;
        bots.forEach(b => b.stayMode = true);
        bot.chat(`/party chat ${translate("stay_enabled_all")}`);
    } else if (args === 'off') {
        newStay = false;
        bots.forEach(b => b.stayMode = false);
        bot.chat(`/party chat ${translate("stay_disabled_all")}`);
    } else {
        // Si no se especifica 'on' u 'off', simplemente toggle el estado del primer bot (y lo aplica a todos)
        newStay = !bots[0]?.stayMode;
        bots.forEach(b => b.stayMode = newStay);
        bot.chat(`/party chat ${translate("stay_mode_command", newStay ? translate("enabled") : translate("disabled"))}`);
    }

    // Si se activó stay y el usuario NO es admin, avisar del límite de 3 juegos / 30s
    if (newStay && !adminList.includes(sender)) {
        setTimeout(() => {
            bot.chat(`/party chat ${translate("stay_limit_info")}`);
        }, 400);
    }
};