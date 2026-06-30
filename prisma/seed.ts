import { PrismaClient, Role, BookingStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@12345', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@ambitionsalon.com' },
    update: {},
    create: {
      fullName: 'Super Admin',
      email: 'superadmin@ambitionsalon.com',
      passwordHash,
      role: Role.SUPER_ADMIN,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@ambitionsalon.com' },
    update: {},
    create: {
      fullName: 'Ambition Salon Owner',
      email: 'owner@ambitionsalon.com',
      passwordHash,
      role: Role.OWNER,
    },
  });

  const stylist = await prisma.user.upsert({
    where: { email: 'stylist@ambitionsalon.com' },
    update: {},
    create: {
      fullName: 'Ayesha Stylist',
      email: 'stylist@ambitionsalon.com',
      passwordHash,
      role: Role.STYLIST,
    },
  });

  const receptionist = await prisma.user.upsert({
    where: { email: 'reception@ambitionsalon.com' },
    update: {},
    create: {
      fullName: 'Reception Desk',
      email: 'reception@ambitionsalon.com',
      passwordHash,
      role: Role.RECEPTIONIST,
    },
  });

  const salon = await prisma.salon.upsert({
    where: { id: 'seed-salon-ambition' },
    update: {},
    create: {
      id: 'seed-salon-ambition',
      name: 'Ambition Unisex Salon',
      ownerId: owner.id,
    },
  });

  const branch = await prisma.branch.upsert({
    where: { id: 'seed-branch-main' },
    update: {},
    create: {
      id: 'seed-branch-main',
      salonId: salon.id,
      name: 'Main Branch',
      city: 'Mumbai',
    },
  });

  const clientsData = [
    { id: 'seed-client-1', fullName: 'Priya Sharma', phone: '9876543210', email: 'priya@example.com', gender: 'Female', city: 'Mumbai', loyaltyPoints: 120, walletBalance: 500, totalVisits: 4, totalSpend: 4500 },
    { id: 'seed-client-2', fullName: 'Rahul Khan', phone: '9876543211', email: 'rahul@example.com', gender: 'Male', city: 'Mumbai', loyaltyPoints: 60, walletBalance: 250, totalVisits: 2, totalSpend: 2100 },
    { id: 'seed-client-3', fullName: 'Neha Patel', phone: '9876543212', email: 'neha@example.com', gender: 'Female', city: 'Mumbai', loyaltyPoints: 200, walletBalance: 1000, totalVisits: 6, totalSpend: 7800 },
  ];

  const clients = [];
  for (const c of clientsData) {
    clients.push(await prisma.client.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    }));
  }

  const categories = [
    { id: 'seed-cat-hair', name: 'Hair Services' },
    { id: 'seed-cat-skin', name: 'Skincare & Facial' },
    { id: 'seed-cat-makeup', name: 'Makeup' },
    { id: 'seed-cat-grooming', name: 'Grooming' },
    { id: 'seed-cat-spa', name: 'Spa & Therapy' },
  ];

  for (const cat of categories) {
    await prisma.serviceCategory.upsert({
      where: { id: cat.id },
      update: { name: cat.name },
      create: cat,
    });
  }

  const servicesData = [
    { categoryId: 'seed-cat-hair', name: 'Haircut', durationMin: 45, price: 700 },
    { categoryId: 'seed-cat-hair', name: 'Blow Dry', durationMin: 30, price: 500 },
    { categoryId: 'seed-cat-hair', name: 'Hair Color', durationMin: 120, price: 2500 },
    { categoryId: 'seed-cat-hair', name: 'Hair Spa', durationMin: 60, price: 1100 },
    { categoryId: 'seed-cat-skin', name: 'Facial', durationMin: 45, price: 900 },
    { categoryId: 'seed-cat-skin', name: 'Clean Up', durationMin: 30, price: 500 },
    { categoryId: 'seed-cat-makeup', name: 'Makeup Trial', durationMin: 120, price: 3500 },
    { categoryId: 'seed-cat-makeup', name: 'Bridal Makeup', durationMin: 180, price: 8000 },
    { categoryId: 'seed-cat-grooming', name: 'Beard Trim', durationMin: 30, price: 300 },
    { categoryId: 'seed-cat-grooming', name: 'Threading', durationMin: 20, price: 200 },
    { categoryId: 'seed-cat-spa', name: 'Head Massage', durationMin: 30, price: 600 },
    { categoryId: 'seed-cat-spa', name: 'Aroma Therapy', durationMin: 60, price: 1200 },
  ];

  for (const svc of servicesData) {
    const svcId = `seed-svc-${svc.name.toLowerCase().replace(/\s+/g, '-')}`;
    await prisma.service.upsert({
      where: { id: svcId },
      update: { name: svc.name, durationMin: svc.durationMin, price: svc.price, categoryId: svc.categoryId, isActive: true },
      create: { id: svcId, ...svc, isActive: true },
    });
  }

  for (const day of [1, 2, 3, 4, 5, 6]) {
    await prisma.staffAvailability.upsert({
      where: {
        branchId_staffId_dayOfWeek_startTime_endTime: {
          branchId: branch.id,
          staffId: stylist.id,
          dayOfWeek: day,
          startTime: '10:00',
          endTime: '19:00',
        },
      },
      update: { isActive: true },
      create: {
        branchId: branch.id,
        staffId: stylist.id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '19:00',
        isActive: true,
      },
    });
  }

  await prisma.booking.deleteMany({
    where: { branchId: branch.id },
  });
  await prisma.walkIn.deleteMany({ where: { branchId: branch.id } });
  await prisma.waitlistEntry.deleteMany({ where: { branchId: branch.id } });
  await prisma.notification.deleteMany();

  const now = new Date();

  const bookings = [
    {
      clientId: clients[0].id,
      title: 'Haircut + Hair Spa',
      status: BookingStatus.CONFIRMED,
      startOffset: 1,
      amount: 1800,
      services: [
        { name: 'Haircut', durationMin: 45, price: 700 },
        { name: 'Hair Spa', durationMin: 60, price: 1100 },
      ],
    },
    {
      clientId: clients[1].id,
      title: 'Beard Trim + Facial',
      status: BookingStatus.PENDING,
      startOffset: 2,
      amount: 1200,
      services: [
        { name: 'Beard Trim', durationMin: 30, price: 300 },
        { name: 'Facial', durationMin: 45, price: 900 },
      ],
    },
    {
      clientId: clients[2].id,
      title: 'Bridal Trial Makeup',
      status: BookingStatus.COMPLETED,
      startOffset: -1,
      amount: 3500,
      services: [
        { name: 'Makeup Trial', durationMin: 120, price: 3500 },
      ],
    },
  ];

  const createdBookings = [];
  for (let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    const startTime = new Date(now);
    startTime.setDate(now.getDate() + b.startOffset);
    startTime.setHours(11 + i * 2, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + b.services.reduce((sum, s) => sum + s.durationMin, 0));

    const created = await prisma.booking.create({
      data: {
        branchId: branch.id,
        clientId: b.clientId,
        staffId: stylist.id,
        title: b.title,
        status: b.status,
        startTime,
        endTime,
        totalAmount: b.amount,
        notes: 'Seed booking for testing',
        services: {
          create: b.services,
        },
      },
    });
    createdBookings.push(created);
  }

  const walkInData = [
    { customerName: 'Anita Desai', phone: '9988776655', serviceName: 'Haircut', status: 'WAITING', queueNumber: 1, estimatedWaitMinutes: 15 },
    { customerName: 'Vikram Singh', phone: '8877665544', serviceName: 'Beard Trim', status: 'COMPLETED', queueNumber: 2, estimatedWaitMinutes: 0, completedAt: new Date(now.getTime() - 1800000) },
  ];

  for (const w of walkInData) {
    const arrivalTime = new Date(now);
    arrivalTime.setHours(arrivalTime.getHours() - 1);
    await prisma.walkIn.create({
      data: {
        branchId: branch.id,
        clientId: w.status === 'COMPLETED' ? clients[0].id : undefined,
        staffId: w.status === 'COMPLETED' ? stylist.id : undefined,
        customerName: w.customerName,
        phone: w.phone,
        serviceName: w.serviceName,
        status: w.status as any,
        queueNumber: w.queueNumber,
        arrivalTime,
        estimatedWaitMinutes: w.estimatedWaitMinutes,
        ...(w.completedAt ? { completedAt: w.completedAt } : {}),
      },
    });
  }

  await prisma.waitlistEntry.create({
    data: {
      branchId: branch.id,
      clientId: clients[1].id,
      staffId: stylist.id,
      requestedDate: new Date(now.getTime() + 86400000),
      preferredStart: new Date(now.getTime() + 86400000 + 3600000 * 10),
      preferredEnd: new Date(now.getTime() + 86400000 + 3600000 * 12),
      serviceName: 'Hair Color',
      notes: 'Prefers morning slot',
      status: 'WAITING',
      priority: 1,
    },
  });

  await prisma.notification.create({
    data: {
      branchId: branch.id,
      type: 'SYSTEM_ALERT',
      priority: 'LOW',
      title: 'Welcome to Ambition Unisex Salon',
      message: 'AI Command Center and Dashboard Analytics are now active. Explore insights and recommendations.',
      link: '/app/ai-command-center',
    },
  });

  await prisma.notification.create({
    data: {
      branchId: branch.id,
      type: 'BOOKING',
      priority: 'MEDIUM',
      title: 'New booking confirmed',
      message: `Booking "${createdBookings[0].title}" for ${clients[0].fullName} has been confirmed.`,
      link: '/app/bookings',
    },
  });

  console.log('Seed completed successfully');
  console.log('Login email: owner@ambitionsalon.com');
  console.log('Password: Admin@12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
