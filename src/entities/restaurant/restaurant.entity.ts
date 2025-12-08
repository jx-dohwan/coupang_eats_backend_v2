import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidEntity } from '../../core/database/typeorm/base.entity';
import { CategoryEntity } from '../category/category.entity';
import { DishEntity } from '../dish/dish.entity';

@Entity('restaurant')
export class RestaurantEntity extends UuidEntity {
  @Column()
  name: string;

  @Column()
  coverImg: string;

  @Column()
  address: string;

  @Column()
  deliveryFee: number;

  @Column()
  minmumPrice: number;

  @Column({ default: false })
  isPromoted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  promotedUnitil: Date;

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
}
