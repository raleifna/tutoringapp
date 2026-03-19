const { prisma } = require('../config/database');

const toBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
    }
    return false;
};

const toReviewItems = (value) =>
    typeof value === 'string'
        ? value
              .split('\n')
              .map((item) => item.trim())
              .filter(Boolean)
              .map((item) => ({ text: item }))
        : [];

const toUploadedFileItems = (files = []) =>
    files.map((file) => ({
        kind: 'file',
        originalName: file.originalname,
        fileName: file.filename,
        url: `/uploads/documents/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
    }));

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
    const {
        email,
        password,
        firstName,
        lastName,
        role,
        isMinor,
        parentName,
        parentEmail,
        parentPhone,
        tutorEducationSummary,
        tutorExperienceYears,
        tutorSupportingNotes,
    } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedFirstName = String(firstName || '').trim();
    const normalizedLastName = String(lastName || '').trim();
    const normalizedRole = String(role || 'LEARNER').trim().toUpperCase();
    const uploadedVerificationFiles = Array.isArray(req.files) ? req.files : [];

    if (!normalizedEmail || !password || !normalizedFirstName || !normalizedLastName) {
        return res.status(400).json({
            success: false,
            message: 'Email, password, first name and last name are required.',
        });
    }

    if (!['LEARNER', 'TUTOR'].includes(normalizedRole)) {
        return res.status(400).json({
            success: false,
            message: 'Role must be LEARNER or TUTOR.',
        });
    }

    if (normalizedRole === 'LEARNER' && toBoolean(isMinor) && !String(parentName || '').trim()) {
        return res.status(400).json({
            success: false,
            message: 'Parent/guardian name is required for minors.',
        });
    }

    if (normalizedRole === 'TUTOR' && !String(tutorEducationSummary || '').trim()) {
        return res.status(400).json({
            success: false,
            message: 'Education summary is required for tutors.',
        });
    }

    if (normalizedRole === 'TUTOR' && uploadedVerificationFiles.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Please upload at least one verification file.',
        });
    }

    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
    });

    if (existingUser) {
        return res.status(409).json({
            success: false,
            message: 'User already exists.',
        });
    }

    const user = await prisma.user.create({
        data: {
            email: normalizedEmail,
            password,
            firstName: normalizedFirstName,
            lastName: normalizedLastName,
            role: normalizedRole,
            ...(normalizedRole === 'LEARNER'
                ? {
                      learnerProfile: {
                          create: {
                              subjects: [],
                              isMinor: toBoolean(isMinor),
                              parentName: String(parentName || '').trim() || null,
                              parentEmail: String(parentEmail || '').trim() || null,
                              parentPhone: String(parentPhone || '').trim() || null,
                          },
                      },
                  }
                : {
                      tutorProfile: {
                          create: {
                              status: 'PENDING',
                              yearsExperience: parseInt(tutorExperienceYears, 10) || 0,
                              education: toReviewItems(tutorEducationSummary),
                              certifications: [
                                  ...toUploadedFileItems(uploadedVerificationFiles),
                                  ...toReviewItems(tutorSupportingNotes).map((item) => ({
                                      ...item,
                                      kind: 'note',
                                  })),
                              ],
                              isVerified: false,
                              verifiedAt: null,
                          },
                      },
                  }),
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
