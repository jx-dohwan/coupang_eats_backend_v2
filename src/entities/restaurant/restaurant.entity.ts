import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidEntity } from '../../core/database/typeorm/base.entity';
import { CategoryEntity } from '../category/category.entity';
import { DishEntity } from '../dish/dish.entity';
import { User } from '../user/user.entity';
import { OrderEntity } from '../order/order.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('restaurant')
export class RestaurantEntity extends UuidEntity {
  @ApiProperty({ description: '식당 이름', example: '교촌치킨 강남점' })
  @Column()
  name: string;

  @ApiProperty({
    description: '커버 이미지 URL',
    example: 'https://img.url/cover.jpg',
  })
  @Column()
  coverImg: string;

  @ApiProperty({ description: '주소', example: '서울시 강남구 역삼동 123-4' })
  @Column()
  address: string;

  @ApiProperty({ description: '배달비', example: 3000 })
  @Column()
  deliveryFee: number;

  @ApiProperty({ description: '최소 주문 금액', example: 15000 })
  @Column()
  minimumPrice: number;

  @ApiProperty({ description: '프로모션 여부', example: false })
  @Column({ default: false })
  isPromoted: boolean;

  @ApiProperty({ description: '프로모션 종료일', nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  promotedUntil: Date;

  @Column()
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' }) // 주인이 탈퇴하면 식당도 삭제
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  categoryId: string;

  @ManyToOne(() => CategoryEntity, (category) => category.restaurants, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoryId' })
  category: CategoryEntity;

  @OneToMany(() => DishEntity, (dish) => dish.restaurant)
  dishes: DishEntity[];

  @OneToMany(() => OrderEntity, (order) => order.restaurant)
  orders: OrderEntity[];
}
