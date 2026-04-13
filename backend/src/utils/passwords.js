const crypto = require('crypto');

function hashPassword(password) {
    return crypto.createHash('sha256').update(String(password || '')).digest('hex');
}

function comparePassword(password, hashedPassword) {
    return hashPassword(password) === hashedPassword;
}

module.exports = {
    hashPassword,
    comparePassword,
};
