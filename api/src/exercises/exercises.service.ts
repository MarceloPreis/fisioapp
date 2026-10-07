import { Category } from '../categories/category.entity';
import { requireTenant } from '../auth/current-user.decorator';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from './exercise.entity';
import { ExerciseRule } from './exercise-rule.entity';
import { ExerciseCountRule } from './exercise-count-rule.entity';
import { CreateExerciseDto, UpdateExerciseDto } from './dto/exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise)
    private exercisesRepository: Repository<Exercise>,
    @InjectRepository(ExerciseRule)
    private rulesRepository: Repository<ExerciseRule>,
    @InjectRepository(ExerciseCountRule)
    private countRulesRepository: Repository<ExerciseCountRule>,
  ) {}

  async findAll(tenantId: string): Promise<Exercise[]> {
    return this.exercisesRepository.find({ where: { tenantId: requireTenant(tenantId) }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<Exercise> {
    const exercise = await this.exercisesRepository.findOne({ where: { id, tenantId: requireTenant(tenantId) } });
    if (!exercise) throw new NotFoundException('Exercício não encontrado');
    return exercise;
  }

  async create(createExerciseDto: CreateExerciseDto, tenantId: string): Promise<Exercise> {
    await this.validateCategory(this.exercisesRepository.manager, createExerciseDto.categoryId, tenantId);
    const exercise = this.exercisesRepository.create({ ...createExerciseDto, tenantId: requireTenant(tenantId) });
    return this.exercisesRepository.save(exercise);
  }

  async update(id: string, dto: UpdateExerciseDto, tenantId: string): Promise<Exercise> {
    return this.exercisesRepository.manager.transaction(async manager => {
      const exercise = await manager.findOne(Exercise, { where: { id, tenantId: requireTenant(tenantId) } });
      if (!exercise) throw new NotFoundException('Exercicio nao encontrado.');
      if (dto.rules !== undefined) await manager.delete(ExerciseRule, { exerciseId: id });
      if (dto.countRules !== undefined) await manager.delete(ExerciseCountRule, { exerciseId: id });
      await this.validateCategory(manager, dto.categoryId, tenantId);
      Object.assign(exercise, dto);
      await manager.save(Exercise, exercise);
      return manager.findOneOrFail(Exercise, { where: { id, tenantId: requireTenant(tenantId) } });
    });
  }

  private async validateCategory(manager: import('typeorm').EntityManager, categoryId: string | undefined, tenantId: string) {
    requireTenant(tenantId);
    if (categoryId && !await manager.findOne(Category, { where: { id: categoryId, tenantId } })) throw new BadRequestException('Categoria não encontrada na clínica.');
  }
  async remove(id: string, tenantId: string): Promise<void> {
    const exercise = await this.findOne(id, tenantId);
    await this.exercisesRepository.remove(exercise);
  }
}
