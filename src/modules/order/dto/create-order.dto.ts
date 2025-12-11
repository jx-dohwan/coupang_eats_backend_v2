import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DishOption } from '../../../entities/dish/dish.interface';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ description: '메뉴 ID (UUID)', example: 'dish-uuid-1234' })
  @IsString()
  dishId: string;

  @ApiProperty({
    description: '선택한 옵션 리스트',
    type: [DishOption],
    required: false,
  })
  @IsOptional()
  @IsArray()
  options?: DishOption[];
}

export class CreateOrderDto {
  @ApiProperty({
    description: '식당 ID (UUID)',
    example: 'restaurant-uuid-1234',
  })
  @IsString()
  restaurantId: string;

  @ApiProperty({
    description: '주문할 메뉴 목록',
    type: [CreateOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
