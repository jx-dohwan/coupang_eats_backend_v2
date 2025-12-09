import { Column, Entity, ManyToOne } from 'typeorm';
import { UuidEntity } from '../../core/database/typeorm/base.entity';
import { User } from '../user/user.entity';
import { RestaurantEntity } from '../restaurant/restaurant.entity';

@Entity('reviews')
export class ReviewEntity extends UuidEntity {
  @Column({ type: 'int' })
  score: number;

  @Column()
  reviewText: string;

  @Column({ type: 'json', nullable: true })
  reviewImg: string[];

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  client: User;

  @ManyToOne(() => RestaurantEntity, { onDelete: 'CASCADE' })
  restaurant: RestaurantEntity;
}
