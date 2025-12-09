import { Injectable } from '@nestjs/common';
import { GenericTypeOrmRepository } from '../../../core/database/typeorm/generic-typeorm.repository';
import { OrderEntity } from '../../../entities/order/order.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class OrderRepository extends GenericTypeOrmRepository<OrderEntity> {
  constructor(dataSource: DataSource) {
    super(
      OrderEntity,
      dataSource.createEntityManager(),
      dataSource.createQueryRunner(),
    );
  }
}
