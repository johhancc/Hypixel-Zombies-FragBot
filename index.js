const { createBot } = require('./utils/botManager');
const accounts = require('./bots/accounts.json');

accounts.forEach((account, i) => {
    setTimeout(() => {
        createBot(account, i + 1);
    }, i * 5000);
});