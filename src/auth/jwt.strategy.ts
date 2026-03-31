import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey:
                configService.get<string>('JWT_SECRET') || 'fallback-secret',
        });
    }

    async validate(payload: { sub: number; email: string }) {
        const user = await this.userService.findById(payload.sub);
        if (!user) {
            throw new UnauthorizedException();
        }
        return { id: user.id, email: user.email, name: user.name };
    }
}
