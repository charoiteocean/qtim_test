import {
    IsOptional,
    IsString,
    IsDateString,
    IsInt,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilterArticleDto {
    @IsOptional()
    @IsString()
    author?: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsDateString()
    publishedFrom?: string;

    @IsOptional()
    @IsDateString()
    publishedTo?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}
