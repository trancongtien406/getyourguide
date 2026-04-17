import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get('admin')
  listAuditLogsAdmin(
    @CurrentUser() actor: JwtPayload,
    @Query() query: ListAuditLogsDto,
  ) {
    return this.auditLogsService.listAuditLogs(actor, query);
  }

  @Get('me')
  listMyAuditLogs(
    @CurrentUser() actor: JwtPayload,
    @Query() query: ListAuditLogsDto,
  ) {
    return this.auditLogsService.listMyAuditLogs(actor, query);
  }

  @Get(':id')
  getAuditLogById(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.auditLogsService.getAuditLogById(actor, id);
  }
}
