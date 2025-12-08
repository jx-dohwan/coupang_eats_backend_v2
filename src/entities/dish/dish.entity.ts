import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UuidEntity } from '../../core/database/typeorm/base.entity';
import { DishOption } from './dish.interface';
import { RestaurantEntity } from '../restaurant/restaurant.entity';

@Entity('dish')
export class DishEntity extends UuidEntity {
  @Column()
  name: string;

  @Column()
  price: number;

  @Column({ nullable: true })
  photo: string;

  @Column()
  description: string;

  @Column({ type: 'json', nullable: true })
  options: DishOption[];

  @Column()
  restaurantId: string;

  @ManyToOne(() => RestaurantEntity, (restaurant) => restaurant.dishes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: RestaurantEntity;
}
