import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { createObserveModule } from '@nestjs/observe';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyModule } from './modules/apiKey/api-key.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { jwtConstants } from './modules/auth/constant/constants.js';
import { HealthModule } from './modules/health/health.module.js';
import { OrganizationMembersModule } from './modules/organization_members/organization_member.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { SurveyResponseModule } from './modules/survey_response/survey_response.module.js';
import { UserModules } from './modules/users/userModules.js';
import { WebhookModules } from './modules/webhook/webhook.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'first_project',
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '1h' },
    }),
    HealthModule,
    UserModules,
    SurveyResponseModule,
    OrganizationsModule,
    OrganizationMembersModule,
    WebhookModules,
    AuthModule,
    ApiKeyModule,
  ],
})
export class AppModule {}
