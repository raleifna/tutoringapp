// for token
const crypto = require('crypto');
const { prisma } = require('../config/database');
const { sendVerificationEmail } = require('../services/emailService');

const toBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        // equals true for 'true', '1', 'yes', 'on'
        return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
    }
    return false;
};

const toReviewItems = (value) =>
    /*
    [
        { text: "UNSW Computer Science" },
        { text: "Master of IT" }
    ]
    */
    typeof value === 'string'
        ? value
              .split('\n')
              .map((item) => item.trim())
              .filter(Boolean)
              .map((item) => ({ text: item }))
        : [];

    // for uploaded files
    /*
    [
        {
            kind: 'file',
            originalName: 'resume.pdf',
            fileName: '171234-resume.pdf',
            url: '/uploads/documents/171234-resume.pdf',
            mimeType: 'application/pdf',
            size: 12345,
            uploadedAt: '2026-04-13T08:20:30.000Z'
        },
        {
            kind: 'file',
            originalName: 'id-card.jpg',
            fileName: '171235-id-card.jpg',
            url: '/uploads/documents/171235-id-card.jpg',
            mimeType: 'image/jpeg',
            size: 45678,
            uploadedAt: '2026-04-13T08:20:30.000Z'
        }
    ]
    */

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

const normalizeIpAddress = (value) => {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const candidate = String(rawValue || '')
        .split(',')[0]
        .trim();

    if (!candidate || candidate.toLowerCase() === 'unknown') {
        return null;
    }

    if (candidate === '::1') {
        return '127.0.0.1';
    }

    return candidate.replace(/^::ffff:/i, '');
};

const getRequestIpAddress = (req) =>
    normalizeIpAddress(
        req.headers['x-forwarded-for'] ||
            req.headers['x-real-ip'] ||
            req.ip ||
            req.socket?.remoteAddress
    );

//password should be hashed in production, but for demo purposes we will store it in plain text (NOT recommended for real applications)
const authUserSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    status: true,
    avatar: true,
    phone: true,
    bio: true,
    createdAt: true,
    lastLoginAt: true,
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

// user authentication and registration logic   
const serializeAuthUser = (user, ipAddress = null) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    avatar: user.avatar || null,
    phone: user.phone || null,
    bio: user.bio || null,
    createdAt: user.createdAt || null,
    lastLoginAt: user.lastLoginAt || null,
    ipAddress,
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

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const createEmailVerificationToken = () => crypto.randomBytes(32).toString('hex');

const createEmailVerificationExpiry = () => {
    const expiresAt = new Date();
    // set expiry to 24 hours from now
    expiresAt.setHours(expiresAt.getHours() + 24);
    return expiresAt;
};

// fix code repetition for checking if email verification is required
const isEmailVerificationRequired = () => {
    const setting = process.env.EMAIL_VERIFICATION_REQUIRED;

    if (setting === 'false') {
        return false;
    }

    return true;
};

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

    const normalizedEmail = normalizeEmail(email);
    const normalizedFirstName = String(firstName || '').trim();
    const normalizedLastName = String(lastName || '').trim();
    const normalizedRole = String(role || 'LEARNER').trim().toUpperCase();
    const uploadedVerificationFiles = Array.isArray(req.files) ? req.files : [];
    const emailVerificationToken = createEmailVerificationToken();
    const emailVerificationExpiry = createEmailVerificationExpiry();

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
            isEmailVerified: false,
            emailVerificationToken,
            emailVerificationExpiry,
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

    const emailResult = await sendVerificationEmail({
        email: normalizedEmail,
        firstName: normalizedFirstName,
        token: emailVerificationToken,
    });

    return res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        user: serializeAuthUser(user),
        verificationDelivery: emailResult.deliveryMethod,
        ...(emailResult.verificationUrl ? { verificationUrl: emailResult.verificationUrl } : {}),
    });
}

async function login(req, res) {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required.',
        });
    }

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: authUserSelectWithPassword,
    });

    if (!user || user.password !== password) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password.',
        });
    }

    if (isEmailVerificationRequired() && !user.isEmailVerified) {
        return res.status(403).json({
            success: false,
            message: 'Please verify your email before logging in.',
        });
    }

    const authenticatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            lastLoginAt: new Date(),
        },
        select: authUserSelect,
    });

    const ipAddress = getRequestIpAddress(req);

    return res.status(200).json({
        success: true,
        message: 'Login successful.',
        accessToken: `demo-token-${user.id}`,
        refreshToken: `demo-refresh-${user.id}`,
        user: serializeAuthUser(authenticatedUser, ipAddress),
    });
}

async function verifyEmail(req, res) {
    const token = String(req.query.token || req.body?.token || '').trim();

    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'Verification token is required.',
        });
    }

    const user = await prisma.user.findUnique({
        where: { emailVerificationToken: token },
        select: {
            id: true,
            emailVerificationExpiry: true,
            isEmailVerified: true,
        },
    });

    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'This verification link is invalid or has expired.',
        });
    }

    if (user.isEmailVerified) {
        return res.status(200).json({
            success: true,
            message: 'Email is already verified.',
        });
    }

    if (!user.emailVerificationExpiry || user.emailVerificationExpiry.getTime() < Date.now()) {
        return res.status(400).json({
            success: false,
            message: 'This verification link is invalid or has expired.',
        });
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            isEmailVerified: true,
            emailVerificationToken: null,
            emailVerificationExpiry: null,
        },
    });

    return res.status(200).json({
        success: true,
        message: 'Email verified successfully.',
    });
}

async function resendVerification(req, res) {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail) {
        return res.status(400).json({
            success: false,
            message: 'Email is required.',
        });
    }

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
            id: true,
            email: true,
            firstName: true,
            isEmailVerified: true,
        },
    });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'No account found for this email.',
        });
    }

    if (user.isEmailVerified) {
        return res.status(400).json({
            success: false,
            message: 'This email is already verified.',
        });
    }

    const emailVerificationToken = createEmailVerificationToken();
    const emailVerificationExpiry = createEmailVerificationExpiry();

    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerificationToken,
            emailVerificationExpiry,
        },
    });

    const emailResult = await sendVerificationEmail({
        email: user.email,
        firstName: user.firstName,
        token: emailVerificationToken,
    });

    return res.status(200).json({
        success: true,
        message: 'Verification email resent.',
        verificationDelivery: emailResult.deliveryMethod,
        ...(emailResult.verificationUrl ? { verificationUrl: emailResult.verificationUrl } : {}),
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
        user: serializeAuthUser(user, getRequestIpAddress(req)),
    });
}

module.exports = {
    register,
    login,
    verifyEmail,
    resendVerification,
    refreshToken,
    logout,
    getMe,
};
