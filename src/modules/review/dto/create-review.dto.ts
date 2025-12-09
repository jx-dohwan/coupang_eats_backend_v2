import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsString()
  orderId: string;

  @IsString()
  restaurantId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @IsString()
  reviewText: string;

  @IsOptional()
  @IsArray()
  reviewImg?: string[];
}
