import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

jest.mock('bcrypt');

describe('AuthService', () => {
    let authService: AuthService;
    let userService: Record<string, jest.Mock>;
    let jwtService: Record<string, jest.Mock>;

    beforeEach(async () => {
        userService = {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
        };

        jwtService = {
            sign: jest.fn().mockReturnValue('test-token'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UserService, useValue: userService },
                { provide: JwtService, useValue: jwtService },
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
    });

    describe('register', () => {
        const dto = {
            email: 'test@test.com',
            password: '123456',
            name: 'Test',
        };

        it('should register a new user and return token', async () => {
            userService.findByEmail.mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
            userService.create.mockResolvedValue({
                id: 1,
                email: dto.email,
                name: dto.name,
                password: 'hashed-password',
                createdAt: new Date(),
                articles: [],
            });

            const result = await authService.register(dto);

            expect(result).toEqual({ accessToken: 'test-token' });
            expect(userService.create).toHaveBeenCalledWith({
                ...dto,
                password: 'hashed-password',
            });
            expect(jwtService.sign).toHaveBeenCalledWith({
                sub: 1,
                email: dto.email,
            });
        });

        it('should throw ConflictException if user exists', async () => {
            userService.findByEmail.mockResolvedValue({
                id: 1,
                email: dto.email,
                name: 'Existing',
                password: 'hash',
                createdAt: new Date(),
                articles: [],
            });

            await expect(authService.register(dto)).rejects.toThrow(
                ConflictException,
            );
        });
    });

    describe('login', () => {
        const dto = { email: 'test@test.com', password: '123456' };

        it('should return token for valid credentials', async () => {
            userService.findByEmail.mockResolvedValue({
                id: 1,
                email: dto.email,
                name: 'Test',
                password: 'hashed',
                createdAt: new Date(),
                articles: [],
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await authService.login(dto);

            expect(result).toEqual({ accessToken: 'test-token' });
        });

        it('should throw UnauthorizedException for wrong email', async () => {
            userService.findByEmail.mockResolvedValue(null);

            await expect(authService.login(dto)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw UnauthorizedException for wrong password', async () => {
            userService.findByEmail.mockResolvedValue({
                id: 1,
                email: dto.email,
                name: 'Test',
                password: 'hashed',
                createdAt: new Date(),
                articles: [],
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(authService.login(dto)).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });
});
