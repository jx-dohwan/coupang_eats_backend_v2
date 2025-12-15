import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from '../../entities/payment/payment.entity';
import { OrderModule } from '../order/order.module';
import { ReviewEntity } from '../../entities/review/review.entity';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { ReviewRepository } from './repository/review.repository';
import { RestaurantModule } from '../restaurant/restaurant.module';
import { ReviewRepositoryModule } from './repository/review-repository.module';

@Module({
  imports: [ReviewRepositoryModule, OrderModule, RestaurantModule],
  controllers: [ReviewController],
  providers: [ReviewService, ReviewRepository],
})
export class ReviewModule {}
