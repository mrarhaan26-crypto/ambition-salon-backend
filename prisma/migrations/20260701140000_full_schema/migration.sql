-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING', 'WAITLIST', 'WALK_IN', 'AI_ALERT', 'STAFF_ALERT', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'CONTACTED', 'BOOKED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('CHAIR', 'ROOM', 'EQUIPMENT', 'STATION');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST', 'STYLIST', 'THERAPIST', 'CASHIER', 'MARKETING_EXECUTIVE');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "WalkInStatus" AS ENUM ('WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'CONVERTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "specialization" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Salon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "businessName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "message" TEXT,
    "formType" TEXT NOT NULL,
    "sourcePage" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "gender" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "address" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastVisitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "staffId" TEXT,
    "resourceId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingService" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "serviceId" TEXT,
    "name" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAvailability" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "clientId" TEXT,
    "staffId" TEXT,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "preferredStart" TIMESTAMP(3),
    "preferredEnd" TIMESTAMP(3),
    "serviceName" TEXT,
    "notes" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalkIn" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "clientId" TEXT,
    "staffId" TEXT,
    "bookingId" TEXT,
    "customerName" TEXT,
    "phone" TEXT,
    "serviceName" TEXT,
    "notes" TEXT,
    "status" "WalkInStatus" NOT NULL DEFAULT 'WAITING',
    "queueNumber" INTEGER NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedWaitMinutes" INTEGER NOT NULL DEFAULT 0,
    "calledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalkIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMin" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSale" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "clientId" TEXT,
    "staffId" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "serviceId" TEXT,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PosSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryProduct" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "category" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "minStockLevel" INTEGER NOT NULL DEFAULT 5,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "InventoryTransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "posSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSetting" (
    "id" TEXT NOT NULL,
    "salonId" TEXT,
    "businessName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "notificationPreferences" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SMS',
    "audienceCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "content" TEXT,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "benefits" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMembership" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "membershipPlanId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validityDays" INTEGER NOT NULL DEFAULT 90,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageService" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPackage" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CREDIT',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "code" TEXT NOT NULL,
    "initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyReward" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'EARNED',
    "description" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fields" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientFormSubmission" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "answers" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineProfile" (
    "id" TEXT NOT NULL,
    "businessName" TEXT,
    "description" TEXT,
    "photos" TEXT,
    "cancellationWindow" INTEGER NOT NULL DEFAULT 24,
    "advanceBookingDays" INTEGER NOT NULL DEFAULT 30,
    "slotSizeMinutes" INTEGER NOT NULL DEFAULT 30,
    "publicServices" BOOLEAN NOT NULL DEFAULT true,
    "publicStaff" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "posSaleId" TEXT,
    "bookingId" TEXT,
    "clientId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "clientId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT,
    "posSaleId" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tax" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adjustment" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MANUAL_CREDIT',
    "bookingId" TEXT,
    "paymentId" TEXT,
    "invoiceId" TEXT,
    "posSaleId" TEXT,
    "clientId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "posSaleId" TEXT,
    "invoiceId" TEXT,
    "clientId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cancellation" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "invoiceId" TEXT,
    "clientId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cancellation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageConversation" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "clientId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" TEXT NOT NULL DEFAULT 'STAFF',
    "content" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "config" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationEventLog" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT,
    "triggerType" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "clientId" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAttendance" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "totalMin" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceId" TEXT,
    "staffId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPayment" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "commissionRuleId" TEXT,
    "bookingId" TEXT,
    "posSaleId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "userId" TEXT,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataExportJob" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "filePath" TEXT,
    "requestedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DataExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "questions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "clientId" TEXT,
    "answers" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT,
    "rating" INTEGER,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'IN_APP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverySetting" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PLACEHOLDER',
    "config" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverySetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryLog" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SIMULATED',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Booking_branchId_idx" ON "Booking"("branchId");

-- CreateIndex
CREATE INDEX "Booking_clientId_idx" ON "Booking"("clientId");

-- CreateIndex
CREATE INDEX "Booking_staffId_idx" ON "Booking"("staffId");

-- CreateIndex
CREATE INDEX "Booking_resourceId_idx" ON "Booking"("resourceId");

-- CreateIndex
CREATE INDEX "Booking_startTime_idx" ON "Booking"("startTime");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "BookingService_bookingId_idx" ON "BookingService"("bookingId");

-- CreateIndex
CREATE INDEX "BookingService_serviceId_idx" ON "BookingService"("serviceId");

-- CreateIndex
CREATE INDEX "StaffAvailability_branchId_idx" ON "StaffAvailability"("branchId");

-- CreateIndex
CREATE INDEX "StaffAvailability_staffId_idx" ON "StaffAvailability"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAvailability_branchId_staffId_dayOfWeek_startTime_endT_key" ON "StaffAvailability"("branchId", "staffId", "dayOfWeek", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "WaitlistEntry_branchId_idx" ON "WaitlistEntry"("branchId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_clientId_idx" ON "WaitlistEntry"("clientId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_staffId_idx" ON "WaitlistEntry"("staffId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_requestedDate_idx" ON "WaitlistEntry"("requestedDate");

-- CreateIndex
CREATE INDEX "WaitlistEntry_status_idx" ON "WaitlistEntry"("status");

-- CreateIndex
CREATE INDEX "WaitlistEntry_priority_idx" ON "WaitlistEntry"("priority");

-- CreateIndex
CREATE INDEX "Resource_branchId_idx" ON "Resource"("branchId");

-- CreateIndex
CREATE INDEX "Resource_type_idx" ON "Resource"("type");

-- CreateIndex
CREATE INDEX "Resource_isActive_idx" ON "Resource"("isActive");

-- CreateIndex
CREATE INDEX "WalkIn_branchId_idx" ON "WalkIn"("branchId");

-- CreateIndex
CREATE INDEX "WalkIn_clientId_idx" ON "WalkIn"("clientId");

-- CreateIndex
CREATE INDEX "WalkIn_staffId_idx" ON "WalkIn"("staffId");

-- CreateIndex
CREATE INDEX "WalkIn_bookingId_idx" ON "WalkIn"("bookingId");

-- CreateIndex
CREATE INDEX "WalkIn_status_idx" ON "WalkIn"("status");

-- CreateIndex
CREATE INDEX "WalkIn_arrivalTime_idx" ON "WalkIn"("arrivalTime");

-- CreateIndex
CREATE INDEX "WalkIn_queueNumber_idx" ON "WalkIn"("queueNumber");

-- CreateIndex
CREATE INDEX "Notification_branchId_idx" ON "Notification"("branchId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_archived_idx" ON "Notification"("archived");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "ServiceCategory_isActive_idx" ON "ServiceCategory"("isActive");

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- CreateIndex
CREATE INDEX "Service_isActive_idx" ON "Service"("isActive");

-- CreateIndex
CREATE INDEX "PosSale_branchId_idx" ON "PosSale"("branchId");

-- CreateIndex
CREATE INDEX "PosSale_clientId_idx" ON "PosSale"("clientId");

-- CreateIndex
CREATE INDEX "PosSale_staffId_idx" ON "PosSale"("staffId");

-- CreateIndex
CREATE INDEX "PosSale_createdAt_idx" ON "PosSale"("createdAt");

-- CreateIndex
CREATE INDEX "PosSaleItem_saleId_idx" ON "PosSaleItem"("saleId");

-- CreateIndex
CREATE INDEX "PosSaleItem_productId_idx" ON "PosSaleItem"("productId");

-- CreateIndex
CREATE INDEX "InventoryProduct_branchId_idx" ON "InventoryProduct"("branchId");

-- CreateIndex
CREATE INDEX "InventoryProduct_sku_idx" ON "InventoryProduct"("sku");

-- CreateIndex
CREATE INDEX "InventoryProduct_isActive_idx" ON "InventoryProduct"("isActive");

-- CreateIndex
CREATE INDEX "InventoryProduct_quantity_idx" ON "InventoryProduct"("quantity");

-- CreateIndex
CREATE INDEX "InventoryTransaction_productId_idx" ON "InventoryTransaction"("productId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_posSaleId_idx" ON "InventoryTransaction"("posSaleId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_createdAt_idx" ON "InventoryTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "MarketingCampaign_branchId_idx" ON "MarketingCampaign"("branchId");

-- CreateIndex
CREATE INDEX "MarketingCampaign_status_idx" ON "MarketingCampaign"("status");

-- CreateIndex
CREATE INDEX "ClientMembership_clientId_idx" ON "ClientMembership"("clientId");

-- CreateIndex
CREATE INDEX "ClientMembership_membershipPlanId_idx" ON "ClientMembership"("membershipPlanId");

-- CreateIndex
CREATE INDEX "ClientMembership_isActive_idx" ON "ClientMembership"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PackageService_packageId_serviceId_key" ON "PackageService"("packageId", "serviceId");

-- CreateIndex
CREATE INDEX "ClientPackage_clientId_idx" ON "ClientPackage"("clientId");

-- CreateIndex
CREATE INDEX "ClientPackage_packageId_idx" ON "ClientPackage"("packageId");

-- CreateIndex
CREATE INDEX "ClientPackage_isActive_idx" ON "ClientPackage"("isActive");

-- CreateIndex
CREATE INDEX "WalletTransaction_clientId_idx" ON "WalletTransaction"("clientId");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");

-- CreateIndex
CREATE INDEX "GiftCard_clientId_idx" ON "GiftCard"("clientId");

-- CreateIndex
CREATE INDEX "GiftCard_code_idx" ON "GiftCard"("code");

-- CreateIndex
CREATE INDEX "GiftCard_status_idx" ON "GiftCard"("status");

-- CreateIndex
CREATE INDEX "LoyaltyReward_clientId_idx" ON "LoyaltyReward"("clientId");

-- CreateIndex
CREATE INDEX "LoyaltyReward_createdAt_idx" ON "LoyaltyReward"("createdAt");

-- CreateIndex
CREATE INDEX "ClientFormSubmission_clientId_idx" ON "ClientFormSubmission"("clientId");

-- CreateIndex
CREATE INDEX "ClientFormSubmission_formId_idx" ON "ClientFormSubmission"("formId");

-- CreateIndex
CREATE INDEX "ClientNote_clientId_idx" ON "ClientNote"("clientId");

-- CreateIndex
CREATE INDEX "Payment_posSaleId_idx" ON "Payment"("posSaleId");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_clientId_idx" ON "Payment"("clientId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receiptNumber_key" ON "Receipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "Receipt_invoiceId_idx" ON "Receipt"("invoiceId");

-- CreateIndex
CREATE INDEX "Receipt_posSaleId_idx" ON "Receipt"("posSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingRule_key_key" ON "BillingRule"("key");

-- CreateIndex
CREATE INDEX "Discount_isActive_idx" ON "Discount"("isActive");

-- CreateIndex
CREATE INDEX "Tax_isActive_idx" ON "Tax"("isActive");

-- CreateIndex
CREATE INDEX "Adjustment_type_idx" ON "Adjustment"("type");

-- CreateIndex
CREATE INDEX "Adjustment_clientId_idx" ON "Adjustment"("clientId");

-- CreateIndex
CREATE INDEX "Adjustment_createdAt_idx" ON "Adjustment"("createdAt");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");

-- CreateIndex
CREATE INDEX "Refund_posSaleId_idx" ON "Refund"("posSaleId");

-- CreateIndex
CREATE INDEX "Refund_clientId_idx" ON "Refund"("clientId");

-- CreateIndex
CREATE INDEX "Cancellation_bookingId_idx" ON "Cancellation"("bookingId");

-- CreateIndex
CREATE INDEX "Cancellation_clientId_idx" ON "Cancellation"("clientId");

-- CreateIndex
CREATE INDEX "MessageConversation_clientId_idx" ON "MessageConversation"("clientId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "AutomationEventLog_ruleId_idx" ON "AutomationEventLog"("ruleId");

-- CreateIndex
CREATE INDEX "Task_assignedTo_idx" ON "Task"("assignedTo");

-- CreateIndex
CREATE INDEX "Task_clientId_idx" ON "Task"("clientId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "StaffAttendance_staffId_idx" ON "StaffAttendance"("staffId");

-- CreateIndex
CREATE INDEX "StaffAttendance_date_idx" ON "StaffAttendance"("date");

-- CreateIndex
CREATE INDEX "CommissionPayment_staffId_idx" ON "CommissionPayment"("staffId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "SurveyResponse_surveyId_idx" ON "SurveyResponse"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliverySetting_channel_key" ON "DeliverySetting"("channel");

-- CreateIndex
CREATE INDEX "DeliveryLog_channel_idx" ON "DeliveryLog"("channel");

-- CreateIndex
CREATE INDEX "DeliveryLog_createdAt_idx" ON "DeliveryLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Salon" ADD CONSTRAINT "Salon_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAvailability" ADD CONSTRAINT "StaffAvailability_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAvailability" ADD CONSTRAINT "StaffAvailability_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkIn" ADD CONSTRAINT "WalkIn_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkIn" ADD CONSTRAINT "WalkIn_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkIn" ADD CONSTRAINT "WalkIn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkIn" ADD CONSTRAINT "WalkIn_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSale" ADD CONSTRAINT "PosSale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSale" ADD CONSTRAINT "PosSale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSale" ADD CONSTRAINT "PosSale_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSaleItem" ADD CONSTRAINT "PosSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSaleItem" ADD CONSTRAINT "PosSaleItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSaleItem" ADD CONSTRAINT "pos_sale_item_product_id" FOREIGN KEY ("productId") REFERENCES "InventoryProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryProduct" ADD CONSTRAINT "InventoryProduct_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InventoryProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "inventory_transaction_pos_sale_id" FOREIGN KEY ("posSaleId") REFERENCES "PosSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_membershipPlanId_fkey" FOREIGN KEY ("membershipPlanId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageService" ADD CONSTRAINT "PackageService_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageService" ADD CONSTRAINT "PackageService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackage" ADD CONSTRAINT "ClientPackage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackage" ADD CONSTRAINT "ClientPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientFormSubmission" ADD CONSTRAINT "ClientFormSubmission_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientFormSubmission" ADD CONSTRAINT "ClientFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "FormTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cancellation" ADD CONSTRAINT "Cancellation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageConversation" ADD CONSTRAINT "MessageConversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MessageConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationEventLog" ADD CONSTRAINT "AutomationEventLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayment" ADD CONSTRAINT "CommissionPayment_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

