import { PrismaClient } from '@prisma/client';
import { ProductCategoryRepository } from '../repositories/product-category.repository';

export class ProductCategoryService {
  private repository: ProductCategoryRepository;

  constructor(private prisma: PrismaClient) {
    this.repository = new ProductCategoryRepository(prisma);
  }

  async create(data: any, companyId: string) {
    // Add any business logic/validation here in the future
    return this.repository.create(data, companyId);
  }

  async findMany(companyId: string) {
    return this.repository.findMany(companyId);
  }

  async findById(id: string, companyId: string) {
    return this.repository.findById(id, companyId);
  }

  async update(id: string, data: any, companyId: string) {
    // Add any business logic/validation here in the future
    return this.repository.update(id, data, companyId);
  }

  async delete(id: string, companyId: string) {
    // Add any business logic/validation here in the future
    return this.repository.delete(id, companyId);
  }
}
