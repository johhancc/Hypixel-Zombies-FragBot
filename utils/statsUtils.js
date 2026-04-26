const fs = require('fs');
const path = require('path');

const invitationCountsPath = path.join(__dirname, '../bots/invitationCounts.json');
const gameJoinsPath = path.join(__dirname, '../bots/gameJoins.json');
const hoursOfUsePath = path.join(__dirname, '../bots/hoursOfUse.json');

// Initialize them once centrally
let globalInvitationCounts = {};
let globalGameJoins = {};
let globalHoursOfUse = {};

function init() {
    try {
        if (!fs.existsSync(invitationCountsPath)) {
            fs.writeFileSync(invitationCountsPath, JSON.stringify({}));
        }
        globalInvitationCounts = JSON.parse(fs.readFileSync(invitationCountsPath));
    } catch (error) {
        globalInvitationCounts = {};
    }

    try {
        if (!fs.existsSync(gameJoinsPath)) {
            fs.writeFileSync(gameJoinsPath, JSON.stringify({}));
        }
        globalGameJoins = JSON.parse(fs.readFileSync(gameJoinsPath));
    } catch (error) {
        globalGameJoins = {};
    }

    try {
        if (!fs.existsSync(hoursOfUsePath)) {
            fs.writeFileSync(hoursOfUsePath, JSON.stringify({}));
        }
        globalHoursOfUse = JSON.parse(fs.readFileSync(hoursOfUsePath));
    } catch (error) {
        globalHoursOfUse = {};
    }
}

function saveInvitationCounts() {
    try {
        fs.writeFileSync(invitationCountsPath, JSON.stringify(globalInvitationCounts, null, 2));
    } catch (ex) {}
}

function saveGameJoins() {
    try {
        fs.writeFileSync(gameJoinsPath, JSON.stringify(globalGameJoins, null, 2));
    } catch (ex) {}
}

function saveHoursOfUse() {
    try {
        fs.writeFileSync(hoursOfUsePath, JSON.stringify(globalHoursOfUse, null, 2));
    } catch (ex) {}
}

function addInvite(username) {
    globalInvitationCounts[username] = (globalInvitationCounts[username] || 0) + 1;
    saveInvitationCounts();
}

function addGame(username) {
    globalGameJoins[username] = (globalGameJoins[username] || 0) + 1;
    saveGameJoins();
}

function addUptime(username, minutes) {
    globalHoursOfUse[username] = (globalHoursOfUse[username] || 0) + (minutes / 60);
    saveHoursOfUse();
}

function getGlobalStats() {
    const totalInvites = Object.values(globalInvitationCounts).reduce((a, b) => a + b, 0);
    const totalGames = Object.values(globalGameJoins).reduce((a, b) => a + b, 0);
    return { totalInvites, totalGames };
}

function getBotUptime(username) {
    const hours = globalHoursOfUse[username] || 0;
    let seconds = Math.floor(hours * 3600);
    const d = Math.floor(seconds / (3600 * 24));
    seconds -= d * 3600 * 24;
    const h = Math.floor(seconds / 3600);
    seconds -= h * 3600;
    const m = Math.floor(seconds / 60);
    const s = seconds - m * 60;

    let parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);
    
    return parts.length > 0 ? parts.join(" ") : "0s";
}

function resetInvites() {
    for (const key in globalInvitationCounts) {
        globalInvitationCounts[key] = 0;
    }
    saveInvitationCounts();
}

init();

module.exports = {
    addInvite,
    addGame,
    addUptime,
    getGlobalStats,
    getBotUptime,
    resetInvites,
    invitationCountsPath
};
