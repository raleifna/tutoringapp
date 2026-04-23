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
        select: {
            id: true,
            email: true,
            timezone: true,
            role: true,
            status: true,
            tutorProfile: {
                select: {
                    id: true,
                    status: true,
                    applicationSubmitted: true,
                    isVerified: true,
                },
            },
        },
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
        timezone: user.timezone || 'UTC',
        role: user.role,
        status: user.status,
        tutorProfile: user.tutorProfile
            ? {
                  id: user.tutorProfile.id,
                  status: user.tutorProfile.status,
                  applicationSubmitted: Boolean(user.tutorProfile.applicationSubmitted),
                  isVerified: Boolean(user.tutorProfile.isVerified),
              }
            : null,
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
        select: {
            id: true,
            email: true,
            timezone: true,
            role: true,
            status: true,
            tutorProfile: {
                select: {
                    id: true,
                    status: true,
                    applicationSubmitted: true,
                    isVerified: true,
                },
            },
        },
    });

    if (user) {
        req.user = {
            id: user.id,
            email: user.email,
            timezone: user.timezone || 'UTC',
            role: user.role,
            status: user.status,
            tutorProfile: user.tutorProfile
                ? {
                      id: user.tutorProfile.id,
                      status: user.tutorProfile.status,
                      applicationSubmitted: Boolean(user.tutorProfile.applicationSubmitted),
                      isVerified: Boolean(user.tutorProfile.isVerified),
                  }
                : null,
        };
    }

    next();
}

module.exports = {
    authenticate,
    optionalAuth,
};
