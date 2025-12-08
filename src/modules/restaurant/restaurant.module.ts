import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';
import { RestaurantRepository } from './repository/restaurant.repository';
import { CategoryModule } from '../category/category.module';
import { RestaurantEntity } from '../../entities/restaurant/restaurant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RestaurantEntity]),
    CategoryModule, // ✅ CategoryRepository를 쓰기 위해 가져옴
  ],
  controllers: [RestaurantController],
  providers: [RestaurantService, RestaurantRepository],
  exports: [
    RestaurantRepository, // 중요: DishService에서 식당 확인을 위해 필요함
  ],
})
export class RestaurantModule {}
