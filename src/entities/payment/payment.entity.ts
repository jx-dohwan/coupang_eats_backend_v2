import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { UuidEntity } from '../../core/database/typeorm/base.entity';
import { User } from '../user/user.entity';
import { RestaurantEntity } from '../restaurant/restaurant.entity';
import { OrderEntity } from '../order/order.entity';

@Entity('payment')
export class PaymentEntity extends UuidEntity {
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

  @Column()
  orderId: string;

  // 주문과 결제는 1:1 관계
  @OneToOne(() => OrderEntity)
  @JoinColumn({ name: 'orderId' })
  order: OrderEntity;
}
