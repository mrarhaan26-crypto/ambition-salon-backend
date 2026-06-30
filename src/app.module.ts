import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './common/prisma.module';

import { AuthModule } from './modules/auth/auth.module';
import { LeadsModule } from './modules/leads/leads.module';
import { UsersModule } from './modules/users/users.module';
import { SalonsModule } from './modules/salons/salons.module';
import { ClientsModule } from './modules/clients/clients.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { WalkInsModule } from './modules/walkins/walkins.module';
import { AiSchedulerModule } from './modules/ai-scheduler/ai-scheduler.module';
import { CalendarAnalyticsModule } from './modules/calendar-analytics/calendar-analytics.module';
import { AiCommandCenterModule } from './modules/ai-command-center/ai-command-center.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { GlobalSearchModule } from './modules/global-search/global-search.module';
import { AiInsightsModule } from './modules/ai-insights/ai-insights.module';
import { DashboardAnalyticsModule } from './modules/dashboard-analytics/dashboard-analytics.module';
import { StaffModule } from './modules/staff/staff.module';
import { ServicesModule } from './modules/services/services.module';
import { PosModule } from './modules/pos/pos.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { FormsModule } from './modules/forms/forms.module';
import { OnlineProfileModule } from './modules/online-profile/online-profile.module';
import { CustomerPortalModule } from './modules/customer-portal/customer-portal.module';
import { PublicBookingModule } from './modules/public-booking/public-booking.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { BillingRulesModule } from './modules/billing-rules/billing-rules.module';
import { AdjustmentsModule } from './modules/adjustments/adjustments.module';
import { MessageCenterModule } from './modules/message-center/message-center.module';
import { NotificationTemplatesModule } from './modules/notification-templates/notification-templates.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { AdvancedReportsModule } from './modules/advanced-reports/advanced-reports.module';
import { BranchesModule } from './modules/branches/branches.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { DataExportModule } from './modules/data-export/data-export.module';
import { StaffWorkspaceModule } from './modules/staff-workspace/staff-workspace.module';
import { OwnerCommandCenterModule } from './modules/owner-command-center/owner-command-center.module';
import { CrmIntelligenceModule } from './modules/crm-intelligence/crm-intelligence.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { DeliverySettingsModule } from './modules/delivery-settings/delivery-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    LeadsModule,
    UsersModule,
    SalonsModule,
    ClientsModule,
    BookingsModule,
    WaitlistModule,
    WalkInsModule,
    AiSchedulerModule,
    CalendarAnalyticsModule,
    AiCommandCenterModule,
    NotificationsModule,
    GlobalSearchModule,
    AiInsightsModule,
    DashboardAnalyticsModule,
    StaffModule,
    ServicesModule,
    PosModule,
    InventoryModule,
    ReportsModule,
    MarketingModule,
    SettingsModule,
    MembershipsModule,
    WalletModule,
    FormsModule,
    OnlineProfileModule,
    CustomerPortalModule,
    PublicBookingModule,
    PermissionsModule,
    PaymentsModule,
    InvoicesModule,
    BillingRulesModule,
    AdjustmentsModule,
    MessageCenterModule,
    NotificationTemplatesModule,
    AutomationsModule,
    TasksModule,
    AttendanceModule,
    CommissionsModule,
    AdvancedReportsModule,
    BranchesModule,
    AuditLogsModule,
    DataExportModule,
    StaffWorkspaceModule,
    OwnerCommandCenterModule,
    CrmIntelligenceModule,
    ResourcesModule,
    ReputationModule,
    SurveysModule,
    DeliverySettingsModule,
  ],
  providers: [],
})
export class AppModule {}



