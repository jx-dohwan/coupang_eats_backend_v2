import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DishService } from './dish.service';
import { DishController } from './dish.controller';
import { DishRepository } from './repository/dish.repository';
import { RestaurantModule } from '../restaurant/restaurant.module';
import { DishEntity } from '../../entities/dish/dish.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([DishEntity]),
    RestaurantModule, // ✅ RestaurantRepository를 쓰기 위해 가져옴
  ],
  controllers: [DishController],
  providers: [DishService, DishRepository],
  exports: [DishRepository],
})
export class DishModule {}
