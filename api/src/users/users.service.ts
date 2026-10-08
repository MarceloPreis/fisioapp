import { requireTenant } from '../auth/current-user.decorator';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.createQueryBuilder('user').addSelect('user.passwordHash').where('user.email = :email', { email }).getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async isPatientAccount(id: string): Promise<boolean> {
    const result = await this.usersRepository.query('SELECT EXISTS(SELECT 1 FROM patients WHERE "userId" = $1) AS linked', [id]);
    return result[0].linked;
  }

  async updateCredentials(id: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(id, { passwordHash, role: 'PHYSIO' });
  }

  async changePatientPassword(
    userId: string,
    tenantId: string,
    patientId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<User> {
    return this.usersRepository.manager.transaction(async manager => {
      const linkedRows = await manager.query(
        `SELECT u.id
         FROM users u
         INNER JOIN patients p
           ON p."userId" = u.id
          AND p."tenantId" = u."tenantId"
         WHERE u.id = $1
           AND u."tenantId" = $2
           AND p.id = $3
         FOR UPDATE OF u, p`,
        [userId, requireTenant(tenantId), patientId],
      );
      if (!linkedRows.length) throw new NotFoundException('Conta de paciente não encontrada.');

      const user = await manager.createQueryBuilder(User, 'user')
        .addSelect('user.passwordHash')
        .where('user.id = :userId AND user.tenantId = :tenantId', {
          userId,
          tenantId,
        })
        .getOne();
      if (!user) throw new NotFoundException('Conta de paciente não encontrada.');
      if (!await bcrypt.compare(currentPassword, user.passwordHash)) {
        throw new BadRequestException('Senha atual incorreta.');
      }

      user.passwordHash = await bcrypt.hash(newPassword, 12);
      user.tokenVersion += 1;
      await manager.save(User, user);
      return user;
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create({ ...userData, tenantId: requireTenant(userData.tenantId!) });
    return this.usersRepository.save(user);
  }
}
