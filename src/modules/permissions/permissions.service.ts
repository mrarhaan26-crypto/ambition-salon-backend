import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyPermissions(user: any) {
    const role = user.role || 'OWNER';
    const isAdmin = ['SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(role);
    return {
      role,
      userId: user.id,
      isAdmin,
      canManageStaff: isAdmin || role === 'RECEPTIONIST',
      canManageBookings: true,
      canManageClients: true,
      canManageServices: isAdmin,
      canManagePos: isAdmin || role === 'CASHIER',
      canManageInventory: isAdmin,
      canManageMarketing: isAdmin || role === 'MARKETING_EXECUTIVE',
      canManageSettings: isAdmin,
      canManagePayments: isAdmin || role === 'CASHIER',
      canManageInvoices: isAdmin,
      canViewReports: isAdmin,
      canViewCustomerPortal: true,
      canManageOnlineProfile: isAdmin,
      canManageMemberships: isAdmin,
      canManageLoyalty: isAdmin,
    };
  }

  async getRoles() {
    return [
      'SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST',
      'STYLIST', 'THERAPIST', 'CASHIER', 'MARKETING_EXECUTIVE',
    ];
  }

  async getAuditSummary() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [newClients, bookings, payments, users] = await Promise.all([
      this.prisma.client.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.booking.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.payment.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count(),
    ]);
    return {
      periodDays: 30,
      newClients,
      bookingsCreated: bookings,
      paymentsProcessed: payments,
      activeStaff: users,
    };
  }
}
