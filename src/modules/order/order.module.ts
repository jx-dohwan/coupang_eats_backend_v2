import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderRepository } from './repository/order.repository';
import { OrderItemRepository } from './repository/order-item.repository';
import { RestaurantModule } from '../restaurant/restaurant.module';
import { DishModule } from '../dish/dish.module';
import { OrderItemEntity } from '../../entities/order/order-item.entity';
import { OrderEntity } from '../../entities/order/order.entity';
import { OrderCronService } from './order-cron.service';
import { EventsModule } from '../../events/events.module';
import { OrderRepositoryModule } from './repository/order-repository.module';
import { OrderItemRepositoryModule } from './repository/order-item-repository.module';

@Module({
  imports: [
    OrderRepositoryModule,
    OrderItemRepositoryModule,
    RestaurantModule,
    DishModule,
    EventsModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderRepository,
    OrderItemRepository,
    OrderCronService,
  ],
  exports: [OrderRepository],
})
export class OrderModule {}
