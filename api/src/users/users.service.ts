import { requireTenant } from '../auth/current-user.decorator';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

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

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create({ ...userData, tenantId: requireTenant(userData.tenantId!) });
    return this.usersRepository.save(user);
  }
}
