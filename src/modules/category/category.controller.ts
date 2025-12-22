import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Public } from '../../core/decorator/public.decorator';
import { AccessTokenGuard } from '../../core/guard/accessToken.guard';
import {
  ApiDocCreated,
  ApiDocOk,
} from '../../core/decorator/swagger.decorator';
import { CategoryEntity } from '../../entities/category/category.entity';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AwsS3Service } from '../../core/aws/aws-s3.service';

@ApiTags('Category (카테고리)')
@Controller('categories')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  @ApiDocCreated('카테고리 생성', CategoryEntity)
  @Post()
  @UseGuards(AccessTokenGuard) // 로그인한 사람만 생성 가능
  @UseInterceptors(FileInterceptor('image'))
  async createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      const url = await this.awsS3Service.uploadImage('category', file);
      createCategoryDto.coverImg = url;
    }
    return this.categoryService.createCategory(createCategoryDto);
  }

  @ApiDocOk('전체 카테고리 조회', [CategoryEntity])
  @Public() // 비로그인 유저도 조회 가능
  @Get()
  async getAllCategories() {
    return this.categoryService.getAllCategories();
  }
}
