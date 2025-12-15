import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentRepository } from './repository/payment.repository';
import { PaymentEntity } from '../../entities/payment/payment.entity';
import { OrderModule } from '../order/order.module';
import { PaymentRepositoryModule } from './repository/payment-repository.module';

@Module({
  imports: [PaymentRepositoryModule, OrderModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository],
})
export class PaymentModule {}
