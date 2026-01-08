import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AwsS3Service } from '../../core/aws/aws-s3.service';
import { ApiDocCreated } from '../../core/decorator/swagger.decorator'; // 사용자가 만든 데코레이터 경로 확인 필요
import { UploadOutput } from './dto/upload.output';

@ApiTags('Upload (파일 업로드)')
@Controller('uploads')
export class UploadController {
  constructor(private readonly awsS3Service: AwsS3Service) {}

  @Post('')
  // 1. 사용자가 만든 커스텀 데코레이터 활용 (응답 문서화 + Bearer Auth 자동 적용)
  @ApiDocCreated('이미지 업로드', UploadOutput)

  // 2. Swagger에 파일 업로드 UI 생성 (이게 없으면 JSON Body로 인식됨)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary', // [중요] 파일 선택 창을 띄우는 설정
          description: '업로드할 이미지 파일 (jpg, jpeg, png)',
        },
        folder: {
          type: 'string',
          description: '저장할 폴더명 (예: restaurant, dish, review)',
          default: 'common', // 기본값 설정
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file')) // 'file'은 위 properties의 키값과 일치해야 함
  async uploadImage(
    @UploadedFile(
      // 3. 파일 유효성 검사 (5MB 제한, 이미지 파일만 허용)
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }), // 이미지 확장자 제한
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('folder') folder: string = 'common',
  ): Promise<UploadOutput> {
    // S3 서비스 호출
    const url = await this.awsS3Service.uploadImage(folder, file);

    return {
      ok: true,
      url: url,
    };
  }
}
