import {
    Body,
    Controller,
    DefaultValuePipe,
    Get,
    ParseIntPipe,
    Post,
    Query,
    UseGuards
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { NewsletterService } from './newsletter.service';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  /** Public — anyone can subscribe */
  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeNewsletterDto) {
    const subscription = await this.newsletterService.subscribe(dto.email);
    return { message: 'Subscribed successfully', subscriptionId: subscription.id };
  }

  /** Public — unsubscribe by email */
  @Post('unsubscribe')
  async unsubscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.newsletterService.unsubscribe(dto.email);
  }

  /** Admin only — list active subscribers */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OPERATOR')
  @Get('subscribers')
  async listSubscribers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.newsletterService.listSubscribers(page, pageSize);
  }
}
