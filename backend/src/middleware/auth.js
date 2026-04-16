const { prisma } = require('../config/database');
const { verifyAccessToken } = require('../utils/tokens');

async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
        });
    }

    const token = authHeader.split(' ')[1];
    let payload;

    try {
        // Decode and verify the JWT before trusting the user id.
        payload = verifyAccessToken(token);
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token.',
        });
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.id },
    });

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'User not found for this token.',
        });
    }

    req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
    };

    next();
}

async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.split(' ')[1];
    let payload;

    try {
        payload = verifyAccessToken(token);
    } catch (error) {
        return next();
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.id },
    });

    if (user) {
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
        };
    }

    next();
}

module.exports = {
    authenticate,
    optionalAuth,
};
