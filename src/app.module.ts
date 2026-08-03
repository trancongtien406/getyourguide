import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { BookingsModule } from './bookings/bookings.module';
import { CartsModule } from './carts/carts.module';
import { CatalogTypesModule } from './catalog-types/catalog-types.module';
import { CatalogModule } from './catalog/catalog.module';
import { CommonModule } from './common/common.module';
import { validate } from './config/env.validation';
import { FavoritesModule } from './favorites/favorites.module';
import { MessagesModule } from './messages/messages.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { PromotionsModule } from './promotions/promotions.module';
import { ReferenceDataModule } from './reference-data/reference-data.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    // Global config with env validation
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    // Global rate limiting: 60 requests per 60 seconds per IP
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,
          limit: 60,
        },
      ],
    }),
    // Cron job scheduler
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    AuditLogsModule,
    ApiKeysModule,
    FavoritesModule,
    MessagesModule,
    BookingsModule,
    CartsModule,
    CatalogTypesModule,
    CatalogModule,
    PaymentsModule,
    UploadsModule,
    PromotionsModule,
    NewsletterModule,
    NotificationsModule,
    ReferenceDataModule,
    BlogModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply ThrottlerGuard globally to all endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
