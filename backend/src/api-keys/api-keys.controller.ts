import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ListApiKeysDto } from './dto/list-api-keys.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  listApiKeys(@CurrentUser() actor: JwtPayload, @Query() query: ListApiKeysDto) {
    return this.apiKeysService.listApiKeys(actor, query);
  }

  @Get(':id')
  getApiKeyById(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.apiKeysService.getApiKeyById(actor, id);
  }

  @Post()
  createApiKey(@CurrentUser() actor: JwtPayload, @Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.createApiKey(actor, dto);
  }

  @Patch(':id')
  updateApiKey(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyDto,
  ) {
    return this.apiKeysService.updateApiKey(actor, id, dto);
  }

  @Post(':id/revoke')
  revokeApiKey(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.apiKeysService.revokeApiKey(actor, id);
  }
}
