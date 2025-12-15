import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DishService } from './dish.service';
import { DishController } from './dish.controller';
import { DishRepository } from './repository/dish.repository';
import { RestaurantModule } from '../restaurant/restaurant.module';
import { DishEntity } from '../../entities/dish/dish.entity';
import { DishRepositoryModule } from './repository/dish-repository.module';
@Module({
  imports: [DishRepositoryModule, RestaurantModule],
  controllers: [DishController],
  providers: [DishService, DishRepository],
  exports: [DishRepository],
})
export class DishModule {}
