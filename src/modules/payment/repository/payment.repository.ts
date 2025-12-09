import { Injectable } from '@nestjs/common';
import { GenericTypeOrmRepository } from '../../../core/database/typeorm/generic-typeorm.repository';
import { PaymentEntity } from '../../../entities/payment/payment.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class PaymentRepository extends GenericTypeOrmRepository<PaymentEntity> {
  constructor(dataSource: DataSource) {
    super(
      PaymentEntity,
      dataSource.createEntityManager(),
      dataSource.createQueryRunner(),
    );
  }
}
