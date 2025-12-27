import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ReviewEntity } from '../../../entities/review/review.entity';
import { User } from '../../../entities/user/user.entity';
import { RestaurantEntity } from '../../../entities/restaurant/restaurant.entity';
import { OrderEntity } from '../../../entities/order/order.entity';

export class CreateReviewDto {
  @ApiProperty({ description: '주문 ID', example: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: '식당 ID', example: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  restaurantId: string;

  @ApiProperty({ description: '평점 (1~5)', example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @ApiProperty({ description: '리뷰 내용', example: '맛있어요' })
  @IsString()
  @IsNotEmpty()
  reviewText: string;

  @ApiProperty({ description: '리뷰 이미지', required: false })
  @IsOptional()
  reviewImg?: string[];

  toEntity(client: User, restaurant: RestaurantEntity, order: OrderEntity): ReviewEntity {
    return plainToInstance(ReviewEntity, {
      score: this.score,
      reviewText: this.reviewText,
      reviewImg: this.reviewImg,
      client: client,
      restaurant: restaurant,
      order: order, // ✅ 주문 정보 연결
      orderId: order.id // ID도 명시적으로
    });
  }
}