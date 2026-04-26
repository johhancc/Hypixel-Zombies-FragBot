const { loadUserLanguages } = require('../utils/userLanguageUtils');

module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots) => {
    if (!whitelist.includes(sender)) return;

    // Parse command again
    const raw = msg.toString().replace(/\n/g, " ");
    const partyChatMatch = raw.match(/^Party > (?:\[.*?\] )?(\w+): (!\w+)/);
    if (!partyChatMatch) return;
    const command = partyChatMatch[2].toLowerCase();

    // Only helpBot should reply to info commands to avoid spam
    // BUT for actions like !de, !lobby, it should be the LEADER (whoever it is) or ALL? 
    // Usually only the party leader can warp.
    // So we check if bot is party leader? 
    // Simplified: All bots attempt to execute, but only leader will succeed.
    // However, for !ping, strictly helpBot or individual response if DM?
    // This is Party Chat. PING should probably be responded by ALL bots? 
    // Or just helpBot? "Muestra la latencia del bot". If I accept !ping, maybe I want to see ALL bots ping?
    // Let's make !ping respond for ALL bots, but maybe with a slight random delay to avoid kick for spam?

    if (command === "!ping") {
        bot.chat(`/party chat PING: ${bot.player.ping}ms`);
        return;
    }

    if (command === "!lobby") {
        bot.chat("/lobby");
        return;
    }

    // Game Shortcuts
    if (command === "!de") {
        bot.chat("/play arcade_zombies_dead_end");
    } else if (command === "!bb") {
        bot.chat("/play arcade_zombies_bad_blood");
    } else if (command === "!aa") {
        bot.chat("/play arcade_zombies_alien_arcadium");
    }
};
