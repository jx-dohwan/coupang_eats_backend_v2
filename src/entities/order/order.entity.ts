import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { UuidEntity } from '../../core/database/typeorm/base.entity';
import { OrderStatus } from '../../common/type/common.interface';
import { User } from '../user/user.entity';
import { RestaurantEntity } from '../restaurant/restaurant.entity';
import { OrderItemEntity } from './order-item.entity';

@Entity('order')
export class OrderEntity extends UuidEntity {
  @Column({ type: 'int', nullable: true })
  total: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.Pending })
  status: OrderStatus;

  // 1. 고객
  @ManyToOne(() => User, (user) => user.orders, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  customer: User;

  @RelationId((order: OrderEntity) => order.customer)
  customerId: string;

  // 2. 배달 기사
  @ManyToOne(() => User, (user) => user.rides, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  driver: User;

  @RelationId((order: OrderEntity) => order.driver)
  driverId: string;

  // 3. 식당
  @ManyToOne(() => RestaurantEntity, (restaurant) => restaurant.orders, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  restaurant: RestaurantEntity;

  @Column()
  restaurantId: string;

  // 4. 주문 항목
  @ManyToMany(() => OrderItemEntity, { eager: true, cascade: true })
  @JoinTable({ name: 'order_items_order_item' })
  items: OrderItemEntity[];
}
