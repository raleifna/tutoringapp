const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SUBJECTS = [
  { name: 'Mathematics', category: 'Mathematics', description: 'General mathematics' },
  { name: 'Calculus', category: 'Mathematics', description: 'Differential and integral calculus' },
  { name: 'Algebra', category: 'Mathematics', description: 'Linear and abstract algebra' },
  { name: 'Statistics', category: 'Mathematics', description: 'Statistics and probability' },
  { name: 'Physics', category: 'Science', description: 'Classical and modern physics' },
  { name: 'Chemistry', category: 'Science', description: 'General and organic chemistry' },
  { name: 'Programming', category: 'Computing', description: 'General programming concepts' },
  { name: 'Python', category: 'Computing', description: 'Python programming language' },
  { name: 'JavaScript', category: 'Computing', description: 'JavaScript and web development' },
  { name: 'Data Science', category: 'Computing', description: 'Data analysis and machine learning' },
  { name: 'English', category: 'Languages', description: 'English language and literature' },
  { name: 'Japanese', category: 'Languages', description: 'Japanese language' },
];

async function upsertUser({ email, password, firstName, lastName, role, status, bio }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      password,
      firstName,
      lastName,
      role,
      status,
      bio: bio || null,
      isEmailVerified: true,
    },
    create: {
      email,
      password,
      firstName,
      lastName,
      role,
      status,
      bio: bio || null,
      isEmailVerified: true,
    },
  });
}

async function main() {
  console.log('Seeding demo data...');

  const subjects = await Promise.all(
    SUBJECTS.map((subject) =>
      prisma.subject.upsert({
        where: { name: subject.name },
        update: subject,
        create: subject,
      })
    )
  );

  const admin = await upsertUser({
    email: 'admin@tutorconnect.com',
    password: 'Admin@123456',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
    status: 'ACTIVE',
    bio: 'Platform administrator account.',
  });

  const learner = await upsertUser({
    email: 'learner@demo.com',
    password: 'Learner@123',
    firstName: 'Alex',
    lastName: 'Johnson',
    role: 'LEARNER',
    status: 'ACTIVE',
    bio: 'University student looking to improve in mathematics and programming.',
  });

  await prisma.learnerProfile.upsert({
    where: { userId: learner.id },
    update: {
      gradeLevel: 'University Year 2',
      learningGoals: 'Improve math and coding skills',
      subjects: ['Mathematics', 'Python', 'Data Science'],
      preferredStyle: 'visual',
    },
    create: {
      userId: learner.id,
      gradeLevel: 'University Year 2',
      learningGoals: 'Improve math and coding skills',
      subjects: ['Mathematics', 'Python', 'Data Science'],
      preferredStyle: 'visual',
    },
  });

  await prisma.subscription.upsert({
    where: { userId: learner.id },
    update: {
      plan: 'FREE',
      status: 'ACTIVE',
    },
    create: {
      userId: learner.id,
      plan: 'FREE',
      status: 'ACTIVE',
    },
  });

  const tutor = await upsertUser({
    email: 'tutor@demo.com',
    password: 'Tutor@123',
    firstName: 'Sarah',
    lastName: 'Chen',
    role: 'TUTOR',
    status: 'ACTIVE',
    bio: 'PhD candidate teaching mathematics and programming.',
  });

  const tutorProfile = await prisma.tutorProfile.upsert({
    where: { userId: tutor.id },
    update: {
      status: 'ACTIVE',
      headline: 'Expert Math and Programming Tutor',
      hourlyRate: 75,
      currency: 'AUD',
      yearsExperience: 8,
      education: [
        { institution: 'UNSW Sydney', degree: 'PhD', field: 'Mathematics', year: '2024' },
      ],
      certifications: [{ name: 'Google Data Analytics Certificate', issuer: 'Google', year: '2022' }],
      languages: ['English', 'Mandarin Chinese'],
      sessionTypes: ['ONLINE', 'IN_PERSON'],
      location: 'Sydney, NSW, Australia',
      rating: 4.9,
      totalReviews: 47,
      totalSessions: 12,
      isVerified: true,
      verifiedAt: new Date(),
      responseTime: 30,
    },
    create: {
      userId: tutor.id,
      status: 'ACTIVE',
      headline: 'Expert Math and Programming Tutor',
      hourlyRate: 75,
      currency: 'AUD',
      yearsExperience: 8,
      education: [
        { institution: 'UNSW Sydney', degree: 'PhD', field: 'Mathematics', year: '2024' },
      ],
      certifications: [{ name: 'Google Data Analytics Certificate', issuer: 'Google', year: '2022' }],
      languages: ['English', 'Mandarin Chinese'],
      sessionTypes: ['ONLINE', 'IN_PERSON'],
      location: 'Sydney, NSW, Australia',
      rating: 4.9,
      totalReviews: 47,
      totalSessions: 12,
      isVerified: true,
      verifiedAt: new Date(),
      responseTime: 30,
    },
  });

  const pendingTutor = await upsertUser({
    email: 'pending.tutor@demo.com',
    password: 'Tutor@123',
    firstName: 'Mia',
    lastName: 'Wong',
    role: 'TUTOR',
    status: 'ACTIVE',
    bio: 'Pending tutor application for admin review.',
  });

  const pendingTutorProfile = await prisma.tutorProfile.upsert({
    where: { userId: pendingTutor.id },
    update: {
      status: 'PENDING',
      headline: 'STEM tutor application',
      hourlyRate: 55,
      currency: 'AUD',
      yearsExperience: 3,
      education: [{ institution: 'USYD', degree: 'BSc', field: 'Physics', year: '2023' }],
      certifications: [{ text: 'Teaching statement submitted' }],
      languages: ['English'],
      sessionTypes: ['ONLINE'],
      location: 'Sydney, NSW, Australia',
      isVerified: false,
      verifiedAt: null,
      responseTime: 90,
    },
    create: {
      userId: pendingTutor.id,
      status: 'PENDING',
      headline: 'STEM tutor application',
      hourlyRate: 55,
      currency: 'AUD',
      yearsExperience: 3,
      education: [{ institution: 'USYD', degree: 'BSc', field: 'Physics', year: '2023' }],
      certifications: [{ text: 'Teaching statement submitted' }],
      languages: ['English'],
      sessionTypes: ['ONLINE'],
      location: 'Sydney, NSW, Australia',
      isVerified: false,
      verifiedAt: null,
      responseTime: 90,
    },
  });

  const byName = Object.fromEntries(subjects.map((subject) => [subject.name, subject]));

  for (const subjectName of ['Mathematics', 'Python', 'Calculus']) {
    const subject = byName[subjectName];
    if (!subject) continue;
    await prisma.tutorSubject.upsert({
      where: {
        tutorId_subjectId: {
          tutorId: tutorProfile.id,
          subjectId: subject.id,
        },
      },
      update: {
        level: 'all',
      },
      create: {
        tutorId: tutorProfile.id,
        subjectId: subject.id,
        level: 'all',
      },
    });
  }

  const pendingSubject = byName.Physics;
  if (pendingSubject) {
    await prisma.tutorSubject.upsert({
      where: {
        tutorId_subjectId: {
          tutorId: pendingTutorProfile.id,
          subjectId: pendingSubject.id,
        },
      },
      update: {
        level: 'intermediate',
      },
      create: {
        tutorId: pendingTutorProfile.id,
        subjectId: pendingSubject.id,
        level: 'intermediate',
      },
    });
  }

  await prisma.tutorAvailability.deleteMany({
    where: {
      tutorId: { in: [tutorProfile.id, pendingTutorProfile.id] },
    },
  });

  await prisma.tutorAvailability.createMany({
    data: [
      { tutorId: tutorProfile.id, dayOfWeek: 1, startTime: '09:00', endTime: '18:00', timezone: 'Australia/Sydney' },
      { tutorId: tutorProfile.id, dayOfWeek: 3, startTime: '10:00', endTime: '16:00', timezone: 'Australia/Sydney' },
      { tutorId: tutorProfile.id, dayOfWeek: 6, startTime: '10:00', endTime: '14:00', timezone: 'Australia/Sydney' },
      { tutorId: pendingTutorProfile.id, dayOfWeek: 2, startTime: '17:00', endTime: '20:00', timezone: 'Australia/Sydney' },
    ],
  });

  const existingBooking = await prisma.booking.findFirst({
    where: {
      learnerId: learner.id,
      tutorId: tutorProfile.id,
      subject: 'Mathematics',
    },
  });

  if (!existingBooking) {
    await prisma.booking.create({
      data: {
        learnerId: learner.id,
        tutorId: tutorProfile.id,
        subject: 'Mathematics',
        status: 'PENDING',
        sessionType: 'ONLINE',
        scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        duration: 60,
        hourlyRate: 75,
        totalAmount: 75,
        currency: 'AUD',
        notes: 'Need help with integration techniques.',
        meetingTool: 'GOOGLE_MEET',
        recurringType: 'ONE_OFF',
        statusHistory: {
          create: [{ status: 'PENDING', reason: 'Seeded demo booking' }],
        },
      },
    });
  }

  await prisma.adminAction.create({
    data: {
      adminId: admin.id,
      targetUserId: pendingTutor.id,
      action: 'TUTOR_PROFILE_RETURNED',
      description: 'Please add more detail to your teaching experience.',
      metadata: { seeded: true },
    },
  }).catch(() => null);

  console.log(`Seeded ${subjects.length} subjects.`);
  console.log('Demo accounts:');
  console.log('  Admin:   admin@tutorconnect.com / Admin@123456');
  console.log('  Learner: learner@demo.com / Learner@123');
  console.log('  Tutor:   tutor@demo.com / Tutor@123');
  console.log('  Pending tutor: pending.tutor@demo.com / Tutor@123');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
