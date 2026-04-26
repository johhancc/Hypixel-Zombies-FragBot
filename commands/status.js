const { loadUserLanguages } = require('../utils/userLanguageUtils');

module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots, setLeader) => {
    const userLanguages = loadUserLanguages();
    const userLanguage = userLanguages[sender] || bot.currentLanguage;
    const translate = (key, ...innerArgs) => translateOriginal(userLanguage, key, ...innerArgs);

    let location = translate("status_lobby");
    if (bot.inLimbo) location = translate("status_limbo");
    else if (bot.joinedGame) location = translate("status_ingame");

    const partyInfo = bot.inParty ? translate("party_in") : translate("party_out");
    const statusMsg = `${translate("status_command", location, partyInfo)}`;

    // Si el mensaje viene de un DM, responder por DM
    const isDM = msg.startsWith("From ");
    if (isDM) {
        bot.chat(`/msg ${sender} ${statusMsg}`);

        // Si todos los bots están ocupados con stayMode, informar de !queue
        const botsInStay = bots.filter(b => b.inParty && b.stayMode);
        if (botsInStay.length > 0) {
            setTimeout(() => {
                bot.chat(`/msg ${sender} ${translate("queue_hint")}`);
            }, 300);
        }
    } else {
        bot.chat(`/party chat ${statusMsg}`);
    }
};