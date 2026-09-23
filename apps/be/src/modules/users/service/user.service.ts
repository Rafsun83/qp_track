import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { FindUsersQueryDto } from '../dto/find-users-query.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { User } from '../entity/user.entity.js';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  findAll(query: FindUsersQueryDto = {}): Promise<User[]> {
    const { userName, loginCount } = query;
    const qb = this.userRepository.createQueryBuilder('user');

    if (userName) {
      qb.andWhere('user.userName ILIKE :userName', {
        userName: `${userName}%`,
      });
    }

    if (loginCount !== undefined) {
      qb.andWhere('user.loginCount = :loginCount', { loginCount });
    }
    // if (userName) {
    //   qb.andWhere('user.userName % :userName', { userName })
    //     .addSelect('similarity(user.userName, :userName)', 'sim')
    //     .orderBy('sim', 'DESC'); // best matches first
    // }

    // if (loginCount !== undefined) {
    //   qb.andWhere('user.loginCount = :loginCount', { loginCount });
    // }

    return qb.getMany();
  }

  findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        id,
      },
      relations: {
        memberships: { organization: { members: true } },
      },
    });
  }

  findOneByUserName(userName: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.userName = :userName', { userName })
      .getOne();
  }

  async create(data: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(data);
    try {
      return await this.userRepository.save(user);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code ===
          POSTGRES_UNIQUE_VIOLATION
      ) {
        throw new ConflictException('userName is already taken');
      }
      throw error;
    }
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.preload({ id, ...data });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async incrementLoginCount(id: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new UnauthorizedException();
    }
    user.loginCount += 1;
    await this.userRepository.save(user);
  }
}
