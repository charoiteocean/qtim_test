import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ArticleService } from './article.service';
import { Article } from './article.entity';

describe('ArticleService', () => {
    let service: ArticleService;
    let mockRepository: Record<string, jest.Mock>;
    let mockCacheManager: Record<string, jest.Mock | Record<string, jest.Mock>>;

    const mockAuthor = { id: 1, name: 'Test', email: 'test@test.com' };
    const mockArticle: Article = {
        id: 1,
        title: 'Test Article',
        description: 'Test description for article',
        publishedAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        author: {
            ...mockAuthor,
            password: 'hash',
            createdAt: new Date(),
            articles: [],
        },
    };

    beforeEach(async () => {
        mockRepository = {
            create: jest.fn().mockReturnValue(mockArticle),
            save: jest.fn().mockResolvedValue(mockArticle),
            findOne: jest.fn(),
            remove: jest.fn().mockResolvedValue(undefined),
            createQueryBuilder: jest.fn(),
        };

        mockCacheManager = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            store: {
                reset: jest.fn().mockResolvedValue(undefined),
                clear: jest.fn().mockResolvedValue(undefined),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ArticleService,
                {
                    provide: getRepositoryToken(Article),
                    useValue: mockRepository,
                },
                { provide: CACHE_MANAGER, useValue: mockCacheManager },
            ],
        }).compile();

        service = module.get<ArticleService>(ArticleService);
    });

    describe('findOne', () => {
        it('should return an article by id', async () => {
            mockRepository.findOne.mockResolvedValue(mockArticle);

            const result = await service.findOne(1);

            expect(result).toEqual({
                id: 1,
                title: 'Test Article',
                description: 'Test description for article',
                publishedAt: mockArticle.publishedAt,
                updatedAt: mockArticle.updatedAt,
                author: { id: 1, name: 'Test', email: 'test@test.com' },
            });
        });

        it('should return cached article if available', async () => {
            const cached = { id: 1, title: 'Cached' };
            (mockCacheManager.get as jest.Mock).mockResolvedValue(cached);

            const result = await service.findOne(1);

            expect(result).toEqual(cached);
            expect(mockRepository.findOne).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException if article not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(service.findOne(999)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('findAll', () => {
        it('should return paginated articles', async () => {
            const qb = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest
                    .fn()
                    .mockResolvedValue([[mockArticle], 1]),
            };
            mockRepository.createQueryBuilder.mockReturnValue(qb);

            const result = (await service.findAll({
                page: 1,
                limit: 10,
            })) as any;

            expect(result.meta).toEqual({
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
            });
            expect(result.data).toHaveLength(1);
        });

        it('should return cached results if available', async () => {
            const cached = { data: [], meta: { total: 0 } };
            (mockCacheManager.get as jest.Mock).mockResolvedValue(cached);

            const result = await service.findAll({ page: 1, limit: 10 });

            expect(result).toEqual(cached);
            expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
        });

        it('should apply filters', async () => {
            const qb = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };
            mockRepository.createQueryBuilder.mockReturnValue(qb);

            await service.findAll({
                page: 1,
                limit: 10,
                author: 'Test',
                title: 'Article',
                publishedFrom: '2024-01-01',
                publishedTo: '2024-12-31',
            });

            expect(qb.andWhere).toHaveBeenCalledTimes(4);
        });
    });

    describe('create', () => {
        it('should create and return article', async () => {
            mockRepository.findOne.mockResolvedValue(mockArticle);

            const result = await service.create(
                {
                    title: 'Test Article',
                    description: 'Test description for article',
                },
                1,
            );

            expect(mockRepository.create).toHaveBeenCalled();
            expect(mockRepository.save).toHaveBeenCalled();
            expect(result.title).toBe('Test Article');
        });
    });

    describe('update', () => {
        it('should update article if user is author', async () => {
            mockRepository.findOne.mockResolvedValue(mockArticle);

            await service.update(1, { title: 'Updated' }, 1);

            expect(mockRepository.save).toHaveBeenCalled();
        });

        it('should throw ForbiddenException if user is not author', async () => {
            mockRepository.findOne.mockResolvedValue(mockArticle);

            await expect(
                service.update(1, { title: 'Updated' }, 999),
            ).rejects.toThrow(ForbiddenException);
        });

        it('should throw NotFoundException if article not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.update(999, { title: 'Updated' }, 1),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('remove', () => {
        it('should remove article if user is author', async () => {
            mockRepository.findOne.mockResolvedValue(mockArticle);

            await service.remove(1, 1);

            expect(mockRepository.remove).toHaveBeenCalledWith(mockArticle);
        });

        it('should throw ForbiddenException if user is not author', async () => {
            mockRepository.findOne.mockResolvedValue(mockArticle);

            await expect(service.remove(1, 999)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('should throw NotFoundException if article not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(service.remove(999, 1)).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
