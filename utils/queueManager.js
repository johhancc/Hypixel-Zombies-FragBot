/**
 * queueManager.js
 * Manages the wait queue for users wanting to use bots that are currently busy (stayMode).
 * Each entry stores { username, originalBot } so we can fallback to the original bot
 * if the free bot can't DM the user directly.
 */

const waitQueue = []; // [{ username: string, originalBot: BotInstance }]

/**
 * Add a user to the queue (or update their originalBot if already in queue).
 * @param {string} username
 * @param {object} originalBot - The mineflayer bot instance the user messaged
 */
function addToQueue(username, originalBot) {
    const existing = waitQueue.find(e => e.username === username);
    if (existing) {
        // Already in queue, just update their originalBot reference
        existing.originalBot = originalBot;
        return false; // Was already in queue
    }
    waitQueue.push({ username, originalBot });
    return true; // Newly added
}

/**
 * Remove a user from the queue by username.
 */
function removeFromQueue(username) {
    const index = waitQueue.findIndex(e => e.username === username);
    if (index > -1) {
        waitQueue.splice(index, 1);
        return true;
    }
    return false;
}

/**
 * Get 1-based position of user in queue. Returns -1 if not found.
 */
function getPosition(username) {
    const index = waitQueue.findIndex(e => e.username === username);
    return index === -1 ? -1 : index + 1;
}

/**
 * Get the first entry in the queue without removing it.
 */
function getNext() {
    return waitQueue.length > 0 ? waitQueue[0] : null;
}

/**
 * Remove and return the first entry in the queue.
 */
function removeFirst() {
    return waitQueue.shift() || null;
}

/**
 * Returns the full queue array (read-only intended).
 */
function getQueue() {
    return waitQueue;
}

module.exports = { addToQueue, removeFromQueue, getPosition, getNext, removeFirst, getQueue };
