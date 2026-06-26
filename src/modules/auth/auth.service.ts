import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  findAll() {
    return {
      module: 'auth',
      status: 'Production authentication running',
    };
  }

  async register(body: any) {
    const { name, fullName, email, password, role } = body;

    const finalFullName = fullName || name;

    if (!finalFullName || !email || !password) {
      throw new BadRequestException('Full name, email and password are required');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: finalFullName,
        email,
        passwordHash,
        role: role || 'OWNER',
      },
    });

    const token = await this.generateToken(user);

    return {
      message: 'Registration successful',
      token,
      user: this.safeUser(user),
    };
  }

  async login(body: any) {
    const { email, password } = body;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.generateToken(user);

    return {
      message: 'Login successful',
      token,
      user: this.safeUser(user),
    };
  }

  private async generateToken(user: any) {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private safeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}