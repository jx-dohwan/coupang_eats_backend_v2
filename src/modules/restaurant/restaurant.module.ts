import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';
import { RestaurantRepository } from './repository/restaurant.repository';
import { CategoryModule } from '../category/category.module';
import { RestaurantEntity } from '../../entities/restaurant/restaurant.entity';
import { RestaurantRepositoryModule } from './repository/restaurant-repository.module';

@Module({
  imports: [RestaurantRepositoryModule, CategoryModule],
  controllers: [RestaurantController],
  providers: [RestaurantService, RestaurantRepository],
  exports: [RestaurantRepository],
})
export class RestaurantModule {}
