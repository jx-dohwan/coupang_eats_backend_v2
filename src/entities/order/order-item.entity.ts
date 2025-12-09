import { Column, Entity, ManyToOne } from "typeorm";
import { UuidEntity } from "../../core/database/typeorm/base.entity";
import { DishEntity } from "../dish/dish.entity";
import { DishOption } from "../dish/dish.interface";

@Entity('order_item')
export class OrderItemEntity extends UuidEntity {
    @ManyToOne(() => DishEntity, {nullable: true, onDelete: 'SET NULL'})
    dish: DishEntity; // 원본 메뉴 연결

    @Column({nullable: true})
    dishName: string; // 주문 당시 메뉴 이름

    @Column({type: 'json', nullable: true})
    options: DishOption[];
}