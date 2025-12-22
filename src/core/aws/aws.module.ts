import { Global, Module } from '@nestjs/common';
import { AwsS3Service } from './aws-s3.service';

@Global() // CoreModule에서 import하면 전역으로 사용 가능하게 설정
@Module({
  providers: [AwsS3Service],
  exports: [AwsS3Service], // 다른 모듈(Restaurant 등)에서 사용하기 위해 export
})
export class AwsModule {}
