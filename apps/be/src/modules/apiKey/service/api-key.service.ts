import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { ApiKey } from '../entity/api-key.entity.js';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async generateApiKey(userId: string, label?: string) {
    const rawKey = 'sk-live_' + crypto.randomBytes(32).toString('hex');
    const prefix = rawKey.slice(0, 16);
    const hashedKey = await bcrypt.hash(rawKey, 10);

    await this.apiKeyRepository.save({
      userId,
      prefix,
      hashedKey,
      label,
    });

    return {
      apiKey: rawKey,
    };
  }

  async validateApiKey(rawKey: string) {
    const prefix = rawKey.slice(0, 16);
    const candidate = await this.apiKeyRepository.findOne({
      where: { prefix, revokedAt: IsNull() },
    });

    if (!candidate) return null;

    const isValid = await bcrypt.compare(rawKey, candidate.hashedKey);
    if (!isValid) return null;

    candidate.lastUpdatedAt = new Date();
    await this.apiKeyRepository.save(candidate);

    return candidate;
  }

  async revokeApiKey(userId: string) {
    const key = await this.apiKeyRepository.findOne({
      where: { userId },
    });
    if (!key) throw new NotFoundException('API key not found');

    key.revokedAt = new Date();
    return this.apiKeyRepository.save(key);
  }
}
