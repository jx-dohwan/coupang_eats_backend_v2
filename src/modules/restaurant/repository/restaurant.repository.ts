import { Injectable } from '@nestjs/common';
import { GenericTypeOrmRepository } from '../../../core/database/typeorm/generic-typeorm.repository';
import { RestaurantEntity } from '../../../entities/restaurant/restaurant.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class RestaurantRepository extends GenericTypeOrmRepository<RestaurantEntity> {
  constructor(dataSource: DataSource) {
    super(
      RestaurantEntity,
      dataSource.createEntityManager(),
      dataSource.createQueryRunner(),
    );
  }
}
