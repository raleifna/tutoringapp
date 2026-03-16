const { prisma } = require('../config/database');

async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    console.log('method =', req.method);
    console.log('path =', req.originalUrl);
    console.log('auth header =', authHeader);
    // expecting something like: Bearer demo-token-userId
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token.startsWith('demo-token-')) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token.',
        });
    }

    const userId = token.replace('demo-token-', '');

    const user = await prisma.user.findUnique({
        where: { id: userId },
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

    if (!token.startsWith('demo-token-')) {
        return next();
    }

    const userId = token.replace('demo-token-', '');

    const user = await prisma.user.findUnique({
        where: { id: userId },
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
