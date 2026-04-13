const { prisma } = require('../config/database');

async function updateMyProfile(req, res) {
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
        });
    }

    const { firstName, lastName, bio, phone } = req.body;

    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
            ...(firstName !== undefined ? { firstName } : {}),
            ...(lastName !== undefined ? { lastName } : {}),
            ...(bio !== undefined ? { bio } : {}),
            ...(phone !== undefined ? { phone } : {}),
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
            role: user.role,
            status: user.status,
            balance: user.balance,
        },
    });
}

module.exports = {
    updateMyProfile,
};
