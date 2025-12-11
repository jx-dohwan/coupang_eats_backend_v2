import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: '카테고리 이름',
    example: '치킨',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: '커버 이미지 URL',
    example: 'https://image.url/chicken.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  coverImg?: string;
}
