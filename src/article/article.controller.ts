import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { FilterArticleDto } from './dto/filter-article.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('articles')
export class ArticleController {
    constructor(private readonly articleService: ArticleService) {}

    @Post()
    @UseGuards(AuthGuard('jwt'))
    create(@Body() dto: CreateArticleDto, @CurrentUser() user: { id: number }) {
        return this.articleService.create(dto, user.id);
    }

    @Get()
    findAll(@Query() filter: FilterArticleDto) {
        return this.articleService.findAll(filter);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.articleService.findOne(id);
    }

    @Put(':id')
    @UseGuards(AuthGuard('jwt'))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateArticleDto,
        @CurrentUser() user: { id: number },
    ) {
        return this.articleService.update(id, dto, user.id);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    remove(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: { id: number },
    ) {
        return this.articleService.remove(id, user.id);
    }
}
