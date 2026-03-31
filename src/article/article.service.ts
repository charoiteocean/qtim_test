import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Article } from './article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { FilterArticleDto } from './dto/filter-article.dto';

@Injectable()
export class ArticleService {
    constructor(
        @InjectRepository(Article)
        private readonly articleRepository: Repository<Article>,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) {}

    async create(
        dto: CreateArticleDto,
        userId: number,
    ): Promise<Record<string, any>> {
        const article = this.articleRepository.create({
            ...dto,
            author: { id: userId } as any,
        });
        const saved = await this.articleRepository.save(article);
        await this.invalidateCache();
        return this.findOne(saved.id);
    }

    async findAll(filter: FilterArticleDto) {
        const { author, title, publishedFrom, publishedTo } = filter;
        const page = filter.page ?? 1;
        const limit = filter.limit ?? 10;

        const cacheKey = `articles:${JSON.stringify(filter)}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }

        const qb = this.articleRepository
            .createQueryBuilder('article')
            .leftJoinAndSelect('article.author', 'author');

        if (author) {
            qb.andWhere('author.name ILIKE :author', { author: `%${author}%` });
        }

        if (title) {
            qb.andWhere('article.title ILIKE :title', { title: `%${title}%` });
        }

        if (publishedFrom) {
            qb.andWhere('article.publishedAt >= :publishedFrom', {
                publishedFrom,
            });
        }

        if (publishedTo) {
            qb.andWhere('article.publishedAt <= :publishedTo', { publishedTo });
        }

        qb.orderBy('article.publishedAt', 'DESC');
        qb.skip((page - 1) * limit);
        qb.take(limit);

        const [data, total] = await qb.getManyAndCount();

        const result = {
            data: data.map((article) => this.sanitizeArticle(article)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };

        await this.cacheManager.set(cacheKey, result, 60000);
        return result;
    }

    async findOne(id: number): Promise<Record<string, any>> {
        const cacheKey = `article:${id}`;
        const cached =
            await this.cacheManager.get<Record<string, any>>(cacheKey);
        if (cached) {
            return cached;
        }

        const article = await this.articleRepository.findOne({
            where: { id },
            relations: ['author'],
        });

        if (!article) {
            throw new NotFoundException(`Article with id ${id} not found`);
        }

        const result = this.sanitizeArticle(article);
        await this.cacheManager.set(cacheKey, result, 60000);
        return result;
    }

    async update(id: number, dto: UpdateArticleDto, userId: number) {
        const article = await this.articleRepository.findOne({
            where: { id },
            relations: ['author'],
        });

        if (!article) {
            throw new NotFoundException(`Article with id ${id} not found`);
        }

        if (article.author.id !== userId) {
            throw new ForbiddenException(
                'You can only update your own articles',
            );
        }

        Object.assign(article, dto);
        await this.articleRepository.save(article);
        await this.invalidateCache();
        return this.findOne(id);
    }

    async remove(id: number, userId: number): Promise<void> {
        const article = await this.articleRepository.findOne({
            where: { id },
            relations: ['author'],
        });

        if (!article) {
            throw new NotFoundException(`Article with id ${id} not found`);
        }

        if (article.author.id !== userId) {
            throw new ForbiddenException(
                'You can only delete your own articles',
            );
        }

        await this.articleRepository.remove(article);
        await this.invalidateCache();
    }

    private sanitizeArticle(article: Article) {
        const { author, ...rest } = article;
        return {
            ...rest,
            author: {
                id: author.id,
                name: author.name,
                email: author.email,
            },
        };
    }

    private async invalidateCache(): Promise<void> {
        // Clear all cache entries by resetting the store
        const store = (this.cacheManager as any).store;
        if (store?.reset) {
            await store.reset();
        } else if (store?.clear) {
            await store.clear();
        }
    }
}
