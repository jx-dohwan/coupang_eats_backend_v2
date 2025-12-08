import { Column, Entity, OneToMany } from 'typeorm';
import { UuidEntity } from '../../core/database/typeorm/base.entity';
import { RestaurantEntity } from '../restaurant/restaurant.entity';

@Entity('category')
export class CategoryEntity extends UuidEntity {
  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  coverImg: string;

  @Column({ unique: true })
  slug: string;

  @OneToMany(() => RestaurantEntity, (restaurant) => restaurant.category)
  restaurants: RestaurantEntity[];
}
