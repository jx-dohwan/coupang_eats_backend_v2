import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Configurations } from '../config';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AwsS3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService<Configurations>) {
    // 1. getOrThrow를 사용하여 환경변수가 없으면 서버 시작 시점에 에러 발생 (안전성 확보)
    // infer: true 옵션으로 타입 추론 활성화
    this.bucketName = this.configService.getOrThrow('AWS.S3_BUCKET_NAME', {
      infer: true,
    });

    const region = this.configService.getOrThrow('AWS.REGION', {
      infer: true,
    });

    // 2. Keyless 인증 (Access Key 없이 Region만 설정)
    // EC2/ECS의 IAM Role을 자동으로 찾아 인증합니다.
    this.s3Client = new S3Client({
      region: region,
    });
  }

  /**
   * 이미지를 S3에 업로드하고 Public URL을 반환합니다.
   * @param folder S3 내의 폴더 경로 (예: 'restaurant', 'dish')
   * @param file 업로드할 파일 객체 (Multer)
   */
  async uploadImage(
    folder: string,
    file: Express.Multer.File,
  ): Promise<string> {
    try {
      // 파일명 생성 (예: restaurant/uuid-random.jpg)
      const key = `${folder}/${this.generateFileName(file.originalname)}`;

      // @aws-sdk/lib-storage를 사용한 업로드 (대용량 파일도 안정적 처리)
      const parallelUploads3 = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
      });

      await parallelUploads3.done();

      // S3 Public URL 반환
      // (주의: 버킷이 Public Access 설정이 되어 있거나 CloudFront를 써야 접근 가능)
      return `https://${this.bucketName}.s3.${this.configService.get(
        'AWS.REGION',
        { infer: true },
      )}.amazonaws.com/${key}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `S3 Upload Failed: ${error.message}`,
      );
    }
  }

  /**
   * 다중 업로드 (병렬처리)
   */
  async uploadImages(
    folder: string,
    files: Array<Express.Multer.File>,
  ): Promise<string[]> {
    // 1. 각 파일마다 uploadImage 함수를 실행하는 Promise 배열을 만든다.
    const uploadPromises = files.map((file) => this.uploadImage(folder, file));

    // 2. Promise.all을 사용하여 모든 업로드가 끝날 때까지 기다리며, 하나라도 실패하면 에러, 모두 성공해야 URL 배열이 반환된다.
    const urls = await Promise.all(uploadPromises);

    return urls;
  }

  /**
   * UUID를 사용하여 고유한 파일명을 생성합니다.
   * 충돌 방지 및 보안을 위해 원본 파일명 대신 랜덤 문자열을 사용합니다.
   */
  private generateFileName(originalName: string): string {
    const ext = path.extname(originalName); // .jpg, .png 등 추출
    return `${uuidv4()}${ext}`; // uuid + 확장자 결합
  }
}
