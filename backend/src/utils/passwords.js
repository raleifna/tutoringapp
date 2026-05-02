const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const BCRYPT_SALT_ROUNDS = 12;
const SHA256_HASH_PATTERN = /^[a-f0-9]{64}$/i;

function hashPassword(password) {
    return bcrypt.hashSync(String(password || ''), BCRYPT_SALT_ROUNDS);
}

function comparePassword(password, hashedPassword) {
    if (!hashedPassword) return false;

    if (isLegacySha256Hash(hashedPassword)) {
        return createLegacySha256Hash(password) === hashedPassword;
    }

    return bcrypt.compareSync(String(password || ''), hashedPassword);
}

function passwordNeedsRehash(hashedPassword) {
    if (!hashedPassword || isLegacySha256Hash(hashedPassword)) return true;

    try {
        return bcrypt.getRounds(hashedPassword) < BCRYPT_SALT_ROUNDS;
    } catch (_error) {
        return true;
    }
}

function isLegacySha256Hash(hashedPassword) {
    return SHA256_HASH_PATTERN.test(String(hashedPassword || ''));
}

function createLegacySha256Hash(password) {
    return crypto.createHash('sha256').update(String(password || '')).digest('hex');
}

module.exports = {
    hashPassword,
    comparePassword,
    passwordNeedsRehash,
};
