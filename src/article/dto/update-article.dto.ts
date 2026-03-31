import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateArticleDto {
    @IsOptional()
    @IsString()
    @MinLength(3)
    title?: string;

    @IsOptional()
    @IsString()
    @MinLength(10)
    description?: string;
}
