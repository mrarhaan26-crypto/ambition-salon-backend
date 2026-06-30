import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const where: any = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.isActive === 'true') where.isActive = true;
    if (query.isActive === 'false') where.isActive = false;
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.inventoryProduct.findMany({
      where,
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.inventoryProduct.findUnique({
      where: { id },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(body: any) {
    if (!body.name) throw new BadRequestException('Product name is required');
    return this.prisma.inventoryProduct.create({
      data: {
        branchId: body.branchId || 'seed-branch-main',
        name: body.name,
        sku: body.sku || null,
        description: body.description || null,
        category: body.category || null,
        quantity: Number(body.quantity) || 0,
        unit: body.unit || 'piece',
        minStockLevel: Number(body.minStockLevel) || 5,
        price: Number(body.price) || 0,
        isActive: body.isActive ?? true,
      },
    });
  }

  async update(id: string, body: any) {
    await this.findOne(id);
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.sku !== undefined) data.sku = body.sku || null;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.category !== undefined) data.category = body.category || null;
    if (body.quantity !== undefined) data.quantity = Number(body.quantity);
    if (body.unit !== undefined) data.unit = body.unit;
    if (body.minStockLevel !== undefined) data.minStockLevel = Number(body.minStockLevel);
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.isActive !== undefined) data.isActive = body.isActive;
    return this.prisma.inventoryProduct.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.inventoryProduct.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getLowStock(query: any) {
    const where: any = {
      quantity: { lte: this.prisma.inventoryProduct.fields.minStockLevel },
      isActive: true,
    };
    if (query.branchId) where.branchId = query.branchId;
    return this.prisma.inventoryProduct.findMany({
      where,
      orderBy: [{ quantity: 'asc' }],
    });
  }

  async adjustStock(id: string, body: any) {
    const product = await this.findOne(id);
    if (!body.type || !['IN', 'OUT', 'ADJUSTMENT'].includes(body.type)) {
      throw new BadRequestException('type must be IN, OUT, or ADJUSTMENT');
    }
    const qty = Number(body.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new BadRequestException('quantity must be a positive number');
    }

    let newQty = product.quantity;
    if (body.type === 'IN') newQty += qty;
    else if (body.type === 'OUT') newQty = Math.max(0, newQty - qty);
    else if (body.type === 'ADJUSTMENT') newQty = qty;

    await this.prisma.$transaction([
      this.prisma.inventoryProduct.update({
        where: { id },
        data: { quantity: newQty },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          productId: id,
          type: body.type,
          quantity: qty,
          notes: body.notes || null,
        },
      }),
    ]);

    return this.findOne(id);
  }
}
