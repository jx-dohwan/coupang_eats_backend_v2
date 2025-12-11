import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { UuidEntity } from '../../core/database/typeorm/base.entity';
import { User } from '../user/user.entity';
import { RestaurantEntity } from '../restaurant/restaurant.entity';
import { OrderEntity } from '../order/order.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('payment')
export class PaymentEntity extends UuidEntity {
  @ApiProperty({ description: 'PG사 거래 ID', example: 'imp_1234567890' })
  @Column()
  transactionId: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  restaurantId: string;

  @ManyToOne(() => RestaurantEntity)
  @JoinColumn({ name: 'restaurantId' })
  restaurant: RestaurantEntity;

  @ApiProperty({ description: '주문 ID', example: 'order-uuid-1234' })
  @Column()
  orderId: string;

  // 주문과 결제는 1:1 관계
  @OneToOne(() => OrderEntity)
  @JoinColumn({ name: 'orderId' })
  order: OrderEntity;
}
