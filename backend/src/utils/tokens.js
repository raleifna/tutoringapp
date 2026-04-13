const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

function getAccessTokenSecret() {
    return process.env.JWT_SECRET || 'dev-access-secret';
}

function getRefreshTokenSecret() {
    return process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
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
