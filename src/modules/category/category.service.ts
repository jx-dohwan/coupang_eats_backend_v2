import { ConflictException, Injectable } from '@nestjs/common';
import { CategoryRepository } from './repository/category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryEntity } from '../../entities/category/category.entity';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async createCategory(dto: CreateCategoryDto): Promise<CategoryEntity> {
    // 1. Slug 생성, 소문자 변환 및 공백을 하이픈으로 대체
    const slug = dto.name.trim().toLowerCase().replace(/ /g, '-');

    // 2. 중복 체크, Generic Repository의 findOneByFilters 활용
    const existing = await this.categoryRepository.findOneByFilters({ slug });
    if (existing) {
      throw new ConflictException('Category already exists');
    }

    // 3. 저장
    const category = this.categoryRepository.create({
      ...dto,
      slug,
    });

    return this.categoryRepository.save(category);
  }

  async getAllCategories() {
    return this.categoryRepository.findAll();
  }
}
