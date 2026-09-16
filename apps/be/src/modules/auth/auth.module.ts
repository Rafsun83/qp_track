import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { OrganizationMembersModule } from '../organization_members/organization_member.module.js';
import { UserModules } from '../users/userModules.js';
import { AuthController } from './controller/auth.controller.js';
import { AuthGuard } from './guard/auth.guard.js';
import { RolesGuard } from './guard/roles.guard.js';
import { AuthService } from './service/auth.service.js';

@Module({
  imports: [UserModules, OrganizationMembersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Order matters: AuthGuard populates request.user before RolesGuard
    // resolves the caller's org-scoped role.
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AuthModule {}
