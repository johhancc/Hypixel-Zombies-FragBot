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

module.exports = { loadUserLanguages, saveUserLanguages };