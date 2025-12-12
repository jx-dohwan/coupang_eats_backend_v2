import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { RestaurantEntity } from '../../../entities/restaurant/restaurant.entity';
import { ReviewEntity } from '../../../entities/review/review.entity';
import { plainToInstance } from 'class-transformer';
import { User } from '../../../entities/user/user.entity';

export class CreateReviewDto {
  @ApiProperty({ description: '주문 ID', example: 'order-uuid-1234' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '식당 ID', example: 'restaurant-uuid-1234' })
  @IsString()
  restaurantId: string;

  @ApiProperty({
    description: '평점 (1~5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @ApiProperty({ description: '리뷰 내용', example: '최고입니다.' })
  @IsString()
  reviewText: string;

  @ApiProperty({
    description: '이미지 URL 리스트',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  reviewImg?: string[];

  toEntity(user: User, restaurant: RestaurantEntity): ReviewEntity {
    const entity = plainToInstance(ReviewEntity, this);

    // 관계 설정
    entity.client = user;
    entity.restaurant = restaurant;

    return entity;
  }
}
