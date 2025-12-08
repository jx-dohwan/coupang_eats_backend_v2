import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Public } from '../../core/decorator/public.decorator';
import { AccessTokenGuard } from '../../core/guard/accessToken.guard';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(AccessTokenGuard) // 로그인한 사람만 생성 가능
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.createCategory(createCategoryDto);
  }

  @Public() // 비로그인 유저도 조회 가능
  @Get()
  async getAllCategories() {
    return this.categoryService.getAllCategories();
  }
}
