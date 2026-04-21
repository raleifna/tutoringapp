const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
    return value;
}

function getAccessTokenSecret() {
    return getRequiredEnv('JWT_SECRET');
}

function getRefreshTokenSecret() {
    return getRequiredEnv('JWT_REFRESH_SECRET');
}

function createAccessToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, status: user.status },
        getAccessTokenSecret(),
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
}

function createRefreshToken(user) {
    return jwt.sign({ id: user.id }, getRefreshTokenSecret(), {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
}

function verifyAccessToken(token) {
    return jwt.verify(token, getAccessTokenSecret());
}

function verifyRefreshToken(token) {
    return jwt.verify(token, getRefreshTokenSecret());
}

module.exports = {
    createAccessToken,
    createRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
};
