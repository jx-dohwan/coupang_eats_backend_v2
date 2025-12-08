import { Injectable } from '@nestjs/common';
import { GenericTypeOrmRepository } from '../../../core/database/typeorm/generic-typeorm.repository';
import { DishEntity } from '../../../entities/dish/dish.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class DishRepository extends GenericTypeOrmRepository<DishEntity> {
  constructor(dataSource: DataSource) {
    super(
      DishEntity,
      dataSource.createEntityManager(),
      dataSource.createQueryRunner(),
    );
  }
}
