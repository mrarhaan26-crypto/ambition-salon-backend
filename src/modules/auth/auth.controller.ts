import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post('register')
  register(@Body() body: any) {
    return this.service.register(body);
  }

  @Post('login')
  login(@Body() body: any) {
    return this.service.login(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return {
      message: 'Authenticated user profile',
      user,
    };
  }
}
