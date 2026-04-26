const { loadUserLanguages } = require('../utils/userLanguageUtils'); // Importa la función para cargar los idiomas de usuario

module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots) => {
    // Verificar si este bot es el 'helpBot'
    const isHelpBot = bots.some(b => b.username === bot.username && b.helpBot);

    if (!isHelpBot) {
        return; // Si no es el helpBot, no ejecuta el comando
    }

    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...innerArgs) => translateOriginal(userLanguage, key, ...innerArgs);

    if (!args || (args !== 'on' && args !== 'off')) {
        bot.chat(`/party chat ${translate("gl_usage")}`);
        return;
    }

    const newGl = args === 'on';
    bots.forEach(b => b.glEnabled = newGl);
    bot.chat(`/party chat ${translate(newGl ? "gl_enabled_all" : "gl_disabled_all")}`);
    sendToWebhook(translate(newGl ? "gl_enabled_webhook" : "gl_disabled_webhook", sender));
};