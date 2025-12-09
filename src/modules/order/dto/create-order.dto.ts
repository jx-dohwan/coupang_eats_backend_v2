import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DishOption } from '../../../entities/dish/dish.interface';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsString()
  dishId: string;

  @IsOptional()
  @IsArray()
  options?: DishOption[];
}

export class CreateOrderDto {
  @IsString()
  restaurantId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
