import { Column, Entity, ManyToOne } from 'typeorm';
import { UuidEntity } from '../../core/database/typeorm/base.entity';
import { User } from '../user/user.entity';
import { RestaurantEntity } from '../restaurant/restaurant.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('reviews')
export class ReviewEntity extends UuidEntity {
  @ApiProperty({ description: '평점 (1~5)', example: 5 })
  @Column({ type: 'int' })
  score: number;

  @ApiProperty({ description: '리뷰 내용', example: '정말 맛있어요!' })
  @Column()
  reviewText: string;

  @ApiProperty({ description: '리뷰 이미지 URL 목록', type: [String], nullable: true })
  @Column({ type: 'json', nullable: true })
  reviewImg: string[];

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  client: User;

  @ManyToOne(() => RestaurantEntity, { onDelete: 'CASCADE' })
  restaurant: RestaurantEntity;
}
