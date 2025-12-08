import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  name: string;

  @IsString()
  coverImg: string;

  @IsString()
  address: string;

  @IsString()
  categoryId: string;

  @IsNumber()
  deliveryFee: number;

  @IsNumber()
  minimumPrice: number;
}
