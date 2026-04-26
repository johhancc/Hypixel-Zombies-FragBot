const { loadUserLanguages } = require('../utils/userLanguageUtils'); // Importa la función para cargar los idiomas de usuario

module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots) => {


    // Buscar si este bot es el 'helpBot'
    const isHelpBot = bots.some(b => b.username === bot.username && b.helpBot);

    if (!isHelpBot) {
        return; // Si no es el helpBot, no envía mensajes de ayuda
    }

    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...args) => translateOriginal(userLanguage, key, ...args);

    const stayStatus = bot.stayMode ? translate("enabled") : translate("disabled");
    const muteStatus = botsMuted ? translate("enabled") : translate("disabled");

    let helpMessages = [
        translate("help_commands"),
        translate("help_status"),
        translate("help_bots"),
        translate("help_say"),
        translate("help_stats"),
        translate("help_lang"),
    ];

    if (adminList.includes(sender)) {
        helpMessages.push(translate("________"));
        helpMessages.push(translate("ADMIN"));
        helpMessages.push(translate("help_add"));
        helpMessages.push(translate("help_remove"));
        helpMessages.push(translate("help_stay", stayStatus));
        helpMessages.push(translate("help_glmessage"));
        helpMessages.push(translate("help_resetinvites"));
        helpMessages.push(translate("help_reload"));
    }

    helpMessages.forEach((hMsg, i) => {
        setTimeout(() => bot.chat(`/party chat ${hMsg}`), i * 500);
    });
};