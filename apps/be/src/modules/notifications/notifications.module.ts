import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organizations } from '../organizations/entity/organization.entity.js';
import { Project } from '../projects/entity/project.entity.js';
import { User } from '../users/entity/user.entity.js';
import { NotificationController } from './controller/notification.controller.js';
import { Notification } from './entity/notification.entity.js';
import { NotificationGateway } from './gateway/notification.gateway.js';
import { NotificationListener } from './listener/notification.listener.js';
import { NotificationService } from './service/notification.service.js';

// Producers never import this module: they emit domain events through the
// global EventEmitter2, and NotificationListener picks them up.
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, Project, Organizations, User]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway, NotificationListener],
})
export class NotificationsModule {}
