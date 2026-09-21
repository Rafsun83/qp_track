import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { createObserveModule } from '@nestjs/observe';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from './config/app.config.js';
import databaseConfig from './config/database.config.js';
import { ApiKeyModule } from './modules/apiKey/api-key.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CommentsModule } from './modules/comments/comments.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { OrganizationMembersModule } from './modules/organization_members/organization_member.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { ProjectMemberModule } from './modules/project_members/projectMember.module.js';
import { ProjectModule } from './modules/projects/project.module.js';
import { SprintModule } from './modules/sprint/sprint.module.js';
import { SurveyResponseModule } from './modules/survey_response/survey_response.module.js';
import { TicketsModule } from './modules/tickets/tockets.module.js';
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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV ?? 'development'}`,
      load: [appConfig, databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (dbConfig: ConfigType<typeof databaseConfig>) => ({
        type: 'postgres',
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.name,
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => ({
        secret: config.jwtSecret,
        signOptions: {
          expiresIn: config.jwtExpiresIn as JwtSignOptions['expiresIn'],
        },
      }),
    }),
    HealthModule,
    UserModules,
    SurveyResponseModule,
    OrganizationsModule,
    OrganizationMembersModule,
    ProjectModule,
    ProjectMemberModule,
    SprintModule,
    TicketsModule,
    CommentsModule,

    WebhookModules,
    AuthModule,
    ApiKeyModule,
  ],
})
export class AppModule {}
