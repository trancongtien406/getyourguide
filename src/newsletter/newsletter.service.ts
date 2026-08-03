import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if already subscribed
    const existing = await this.prisma.newsletterSubscription.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Email is already subscribed');
      }
      // Re-activate a previously unsubscribed email
      return this.prisma.newsletterSubscription.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          subscribedAt: new Date(),
          unsubscribedAt: null,
        },
      });
    }

    return this.prisma.newsletterSubscription.create({
      data: {
        email: normalizedEmail,
      },
    });
  }

  async unsubscribe(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.prisma.newsletterSubscription.findUnique({
      where: { email: normalizedEmail },
    });

    if (!existing || !existing.isActive) {
      return { message: 'Email is not subscribed' };
    }

    await this.prisma.newsletterSubscription.update({
      where: { id: existing.id },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
      },
    });

    return { message: 'Successfully unsubscribed' };
  }

  async listSubscribers(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.newsletterSubscription.findMany({
        where: { isActive: true },
        orderBy: { subscribedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.newsletterSubscription.count({ where: { isActive: true } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
