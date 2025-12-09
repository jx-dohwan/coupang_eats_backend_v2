import { Injectable } from '@nestjs/common';
import { GenericTypeOrmRepository } from '../../../core/database/typeorm/generic-typeorm.repository';
import { OrderItemEntity } from '../../../entities/order/order-item.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class OrderItemRepository extends GenericTypeOrmRepository<OrderItemEntity> {
  constructor(dataSource: DataSource) {
    super(
      OrderItemEntity,
      dataSource.createEntityManager(),
      dataSource.createQueryRunner(),
    );
  }
}
