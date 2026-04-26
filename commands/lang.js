const fs = require('fs');
const path = require('path');

const userLanguagesPath = path.join(__dirname, '../data/userLanguages.json');

function loadUserLanguages() {
    try {
        if (fs.existsSync(userLanguagesPath)) {
            const data = fs.readFileSync(userLanguagesPath);
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error("Error loading user languages:", error);
        return {};
    }
}

function saveUserLanguages(languages) {
    try {
        fs.writeFileSync(userLanguagesPath, JSON.stringify(languages, null, 2));
    } catch (error) {
        console.error("Error saving user languages:", error);
    }
}

module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translate, sendToWebhook, activeParties, fsOriginal, pathOriginal, reloadConfigs, bots) => {
    // Verificar si este bot es el 'helpBot'
    const isHelpBot = bots.some(b => b.username === bot.username && b.helpBot);

    if (!isHelpBot) {
        return; // Si no es el helpBot, no ejecuta el comando
    }

    const botPartyLeader = Object.keys(activeParties).find(leader => {
        const partyMembers = activeParties[leader];
        return Array.isArray(partyMembers) && partyMembers?.includes(bot.username);
    });

    // Ya no verificamos si es admin, cualquier sender puede usarlo
    if (args === 'en' || args === 'es') {
        const userLanguages = loadUserLanguages();
        userLanguages[sender] = args; // Guardar la preferencia del usuario
        saveUserLanguages(userLanguages);

        if (bots && Array.isArray(bots)) {
            bots.forEach(b => {
                b.currentLanguage = args;
            });
            bot.chat(`/party chat ${translate(args, "lang_changed_user", args, sender)}`); // Usamos 'args' como el idioma para la traducción
            console.log(`[LANG] Idioma de ${sender} y los bots cambiado a:`, args);
        } else {
            bot.chat(`/party chat ${translate(bot.currentLanguage, "no_bots_online")}`);
        }
    } else {
        bot.chat(`/party chat ${translate(bot.currentLanguage, "lang_usage")}`);
    }
};