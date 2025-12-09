import { Injectable } from '@nestjs/common';
import { GenericTypeOrmRepository } from '../../../core/database/typeorm/generic-typeorm.repository';
import { ReviewEntity } from '../../../entities/review/review.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class ReviewRepository extends GenericTypeOrmRepository<ReviewEntity> {
  constructor(dataSource: DataSource) {
    super(
      ReviewEntity,
      dataSource.createEntityManager(),
      dataSource.createQueryRunner(),
    );
  }
}
