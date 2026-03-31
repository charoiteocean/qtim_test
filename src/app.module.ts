import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ArticleModule } from './article/article.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),

        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'postgres' as const,
                host: config.get<string>('DB_HOST', 'localhost'),
                port: config.get<number>('DB_PORT', 5432),
                username: config.get<string>('DB_USERNAME', 'postgres'),
                password: config.get<string>('DB_PASSWORD', 'postgres'),
                database: config.get<string>('DB_NAME', 'nest_api'),
                autoLoadEntities: true,
                synchronize: false,
                migrations: ['dist/migrations/*.js'],
                migrationsRun: true,
            }),
        }),

        CacheModule.registerAsync({
            isGlobal: true,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const host = config.get('REDIS_HOST', 'localhost');
                const port = config.get<number>('REDIS_PORT', 6379);
                return {
                    stores: [new KeyvRedis(`redis://${host}:${port}`)],
                    ttl: 60000,
                };
            },
        }),

        AuthModule,
        UserModule,
        ArticleModule,
    ],
})
export class AppModule {}
