import { requireTenant } from '../auth/current-user.decorator';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  findAll(tenantId: string): Promise<Category[]> {
    return this.categoriesRepository.find({ where: { tenantId: requireTenant(tenantId) }, order: { name: 'ASC' } });
  }

  async findOne(id: string, tenantId: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ where: { id, tenantId: requireTenant(tenantId) } });
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return category;
  }

  create(createCategoryDto: CreateCategoryDto, tenantId: string): Promise<Category> {
    const category = this.categoriesRepository.create({ ...createCategoryDto, tenantId: requireTenant(tenantId) });
    return this.categoriesRepository.save(category);
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, tenantId: string): Promise<Category> {
    const category = await this.findOne(id, tenantId);
    Object.assign(category, updateCategoryDto);
    return this.categoriesRepository.save(category);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const category = await this.findOne(id, tenantId);
    await this.categoriesRepository.remove(category);
  }
}
