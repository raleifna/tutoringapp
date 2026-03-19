const { prisma } = require('../config/database');

const authUserSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    status: true,
    isEmailVerified: true,
    tutorProfile: {
        select: {
            id: true,
            status: true,
            isVerified: true,
        },
    },
};

const authUserSelectWithPassword = {
    ...authUserSelect,
    password: true,
};

const serializeAuthUser = (user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    isEmailVerified: Boolean(user.isEmailVerified),
    tutorProfileId: user.tutorProfile?.id || null,
    tutorProfile: user.tutorProfile
        ? {
              id: user.tutorProfile.id,
              status: user.tutorProfile.status,
              isVerified: Boolean(user.tutorProfile.isVerified),
          }
        : null,
});

async function register(req, res) {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
            success: false,
            message: 'Email, password, first name and last name are required.',
        });
    }

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return res.status(409).json({
            success: false,
            message: 'User already exists.',
        });
    }

    const user = await prisma.user.create({
        data: {
            email,
            password,
            firstName,
            lastName,
        },
        select: authUserSelect,
    });

    return res.status(201).json({
        success: true,
        message: 'Register successful.',
        user: serializeAuthUser(user),
    });
}

async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required.',
        });
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: authUserSelectWithPassword,
    });

    if (!user || user.password !== password) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password.',
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Login successful.',
        accessToken: `demo-token-${user.id}`,
        refreshToken: `demo-refresh-${user.id}`,
        user: serializeAuthUser(user),
    });
}

async function refreshToken(req, res) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            message: 'Refresh token is required.',
        });
    }

    if (!refreshToken.startsWith('demo-refresh-')) {
        return res.status(401).json({
            success: false,
            message: 'Invalid refresh token.',
        });
    }

    const userId = refreshToken.replace('demo-refresh-', '');

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found.',
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Token refreshed.',
        accessToken: `demo-token-${user.id}`,
    });
}

async function logout(req, res) {
    return res.status(200).json({
        success: true,
        message: 'Logout successful.',
    });
}

// should return the currently logged-in user
async function getMe(req, res) {
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
        });
    }

    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: authUserSelect,
    });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found.',
        });
    }

    return res.status(200).json({
        success: true,
        user: serializeAuthUser(user),
    });
}

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    getMe,
};
