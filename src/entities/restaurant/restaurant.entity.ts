import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidEntity } from '../../core/database/typeorm/base.entity';
import { CategoryEntity } from '../category/category.entity';
import { DishEntity } from '../dish/dish.entity';
import { User } from '../user/user.entity';

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
  minimumPrice: number;

  @Column({ default: false })
  isPromoted: boolean;

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
}
