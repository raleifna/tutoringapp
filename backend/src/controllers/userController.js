const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { isValidTimezone } = require('../utils/timezone');

async function updateMyProfile(req, res) {
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
        });
    }

    const { firstName, lastName, bio, phone, timezone } = req.body;
    const nextTimezone = timezone === undefined ? undefined : String(timezone || '').trim();

    if (nextTimezone !== undefined && !isValidTimezone(nextTimezone)) {
        throw new AppError('Invalid timezone. Use a valid IANA timezone, such as Australia/Sydney.', 400);
    }

    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
            ...(firstName !== undefined ? { firstName } : {}),
            ...(lastName !== undefined ? { lastName } : {}),
            ...(bio !== undefined ? { bio } : {}),
            ...(phone !== undefined ? { phone } : {}),
            ...(nextTimezone !== undefined ? { timezone: nextTimezone } : {}),
        },
    });

    return res.status(200).json({
        success: true,
        message: 'Profile updated.',
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            bio: user.bio,
            phone: user.phone,
            timezone: user.timezone,
            role: user.role,
            status: user.status,
        },
    });
}

module.exports = {
    updateMyProfile,
};
