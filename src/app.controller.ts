import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/infrastructure/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('status')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Obtener estado de la API' })
  getHello(): string {
    return this.appService.getHello();
  }
}
