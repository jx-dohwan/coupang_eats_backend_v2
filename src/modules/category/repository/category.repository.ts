import { Injectable } from '@nestjs/common';
import { GenericTypeOrmRepository } from '../../../core/database/typeorm/generic-typeorm.repository';
import { CategoryEntity } from '../../../entities/category/category.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class CategoryRepository extends GenericTypeOrmRepository<CategoryEntity> {
  constructor(dataSource: DataSource) {
    super(
      CategoryEntity,
      dataSource.createEntityManager(),
      dataSource.createQueryRunner(),
    );
  }
}
