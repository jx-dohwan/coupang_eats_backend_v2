import {
    Body,
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    BadRequestException,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
  import { AwsS3Service } from '../../core/aws/aws-s3.service';
  import { ApiDocCreated } from '../../core/decorator/swagger.decorator';
  import { UploadOutput } from './dto/upload.output';
  
  // 1. 허용할 폴더 목록을 Enum으로 정의
  enum UploadFolder {
    RESTAURANT = 'restaurant',
    DISH = 'dish',
    REVIEW = 'review',
    PROFILE = 'profile',
    COMMON = 'common',
  }
  
  @ApiTags('Upload (파일 업로드)')
  @Controller('uploads')
  export class UploadController {
    constructor(private readonly awsS3Service: AwsS3Service) {}
  
    @Post('')
    @ApiDocCreated('이미지 업로드', UploadOutput)
    @ApiConsumes('multipart/form-data')
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: '업로드할 이미지 파일 (jpg, jpeg, png)',
          },
          folder: {
            type: 'string',
            // 2. Swagger에 Enum 적용 (드롭다운 생성)
            enum: Object.values(UploadFolder), 
            description: '저장할 폴더 선택 (기본값: common)',
            default: UploadFolder.COMMON,
          },
        },
        required: ['file'],
      },
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(
      @UploadedFile(
        new ParseFilePipe({
          validators: [
            new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }),
            new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
          ],
        }),
      )
      file: Express.Multer.File,
      // 3. 실제 코드에서도 Enum 타입으로 받음
      @Body('folder') folder: UploadFolder = UploadFolder.COMMON,
    ): Promise<UploadOutput> {
      
      // (선택 사항) Enum에 없는 값이 강제로 들어왔을 때 방어 로직
      const allowedFolders = Object.values(UploadFolder);
      if (!allowedFolders.includes(folder)) {
          throw new BadRequestException('유효하지 않은 폴더명입니다.');
      }
  
      const url = await this.awsS3Service.uploadImage(folder, file);
  
      return {
        ok: true,
        url: url,
      };
    }
  }