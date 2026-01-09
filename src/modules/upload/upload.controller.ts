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
  import { ApiDocCreated } from '../../core/decorator/swagger.decorator'; // 커스텀 데코레이터
  import { UploadOutput } from './dto/upload.output';
  
  // 1. [안전 장치] 허용할 폴더 목록을 미리 정의 (Enum)
  // 쿠팡이츠 서비스에 필요한 폴더들입니다.
  enum UploadFolder {
    RESTAURANT = 'restaurant', // 식당 이미지
    DISH = 'dish',             // 메뉴(음식) 이미지
    REVIEW = 'review',         // 리뷰 이미지
    PROFILE = 'profile',       // 유저 프로필
    COMMON = 'common',         // 기타 공용
  }
  
  @ApiTags('Upload (파일 업로드)')
  @Controller('uploads')
  export class UploadController {
    constructor(private readonly awsS3Service: AwsS3Service) {}
  
    @Post('')
    @ApiDocCreated('이미지 S3 업로드', UploadOutput) // 커스텀 데코레이터 적용
    @ApiConsumes('multipart/form-data') // 파일 전송 설정
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: '업로드할 이미지 파일 (jpg, jpeg, png, 5MB 이하)',
          },
          folder: {
            type: 'string',
            // 2. [스웨거 UI] 여기에 Enum을 넣으면 드롭다운 메뉴가 생성됩니다!
            enum: Object.values(UploadFolder),
            default: UploadFolder.COMMON,
            description: '이미지가 저장될 폴더 선택',
          },
        },
        required: ['file'],
      },
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(
      @UploadedFile(
        // 3. [유효성 검사] 5MB 제한 + 이미지 파일만 허용
        new ParseFilePipe({
          validators: [
            new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }),
            new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
          ],
        }),
      )
      file: Express.Multer.File,
      
      // 4. [파라미터 바인딩] 입력받은 folder 값을 Enum 타입으로 받음
      @Body('folder') folder: UploadFolder = UploadFolder.COMMON,
    ): Promise<UploadOutput> {
      
      // 방어 로직: 혹시라도 스웨거 외에서 이상한 문자열을 보냈을 경우 차단
      if (!Object.values(UploadFolder).includes(folder)) {
          throw new BadRequestException(`잘못된 폴더명입니다. 허용된 값: ${Object.values(UploadFolder).join(', ')}`);
      }
  
      // S3 업로드 수행
      const url = await this.awsS3Service.uploadImage(folder, file);
  
      return {
        ok: true,
        url: url,
      };
    }
  }