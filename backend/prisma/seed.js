const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    // keeping stage 1 seed very small
    await prisma.user.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
            email: 'demo@example.com',
            password: '123456',
            firstName: 'Demo',
            lastName: 'User',
            role: 'LEARNER',
            status: 'ACTIVE',
            isEmailVerified: true,
        },
    });

    console.log('Stage 1 seed finished.');
}

main()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
