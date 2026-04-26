module.exports = (bot, msg, args, sender, adminList, botsMuted, whitelist, translateOriginal, sendToWebhook, activeParties, fs, path, reloadConfigs, bots) => {
    if (!whitelist.includes(sender)) return;

    const raw = msg.toString().replace(/\n/g, " ");
    const partyChatMatch = raw.match(/^Party > (?:\[.*?\] )?(\w+): (!\w+)/);
    if (!partyChatMatch) return;
    const command = partyChatMatch[2].toLowerCase();

    if (command === "!sneak" || command === "!twerk") {
        const interval = setInterval(() => {
            bot.setControlState('sneak', true);
            setTimeout(() => bot.setControlState('sneak', false), 250);
        }, 500);
        setTimeout(() => clearInterval(interval), 3000); // 3 seconds of twerking
    } else if (command === "!jump") {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
    } else if (command === "!spin") {
        const currentYaw = bot.entity.yaw;
        let steps = 20;
        const interval = setInterval(() => {
            bot.look(bot.entity.yaw + (Math.PI * 2 / steps), bot.entity.pitch);
            steps--;
            if (steps <= 0) clearInterval(interval);
        }, 50);
    } else if (command === "!look") {
        const target = bot.players[sender] ? bot.players[sender].entity : null;
        if (target) {
            bot.lookAt(target.position.offset(0, target.height, 0));
        }
    }
};
