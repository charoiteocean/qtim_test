import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) {}

    async register(dto: RegisterDto) {
        const existing = await this.userService.findByEmail(dto.email);
        if (existing) {
            throw new ConflictException('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.userService.create({
            ...dto,
            password: hashedPassword,
        });

        return this.buildTokenResponse(user.id, user.email);
    }

    async login(dto: LoginDto) {
        const user = await this.userService.findByEmail(dto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
            dto.password,
            user.password,
        );
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.buildTokenResponse(user.id, user.email);
    }

    private buildTokenResponse(userId: number, email: string) {
        const payload = { sub: userId, email };
        return {
            accessToken: this.jwtService.sign(payload),
        };
    }
}
