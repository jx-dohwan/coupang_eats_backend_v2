import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidEntity } from '../../core/database/typeorm/base.entity';
import { RestaurantEntity } from '../restaurant/restaurant.entity';
import { User } from '../user/user.entity';

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

  @Column()
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;
}
