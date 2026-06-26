const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    take: 10,
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  const branches = await prisma.branch.findMany({
    take: 10,
    select: {
      id: true,
      name: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  const bookingServices = await prisma.bookingService.findMany({
    take: 10,
    select: {
      id: true,
      name: true,
      durationMin: true,
      price: true,
      bookingId: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(JSON.stringify({ users, branches, bookingServices }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
