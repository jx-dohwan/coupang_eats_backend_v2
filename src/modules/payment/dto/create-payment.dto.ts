import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ description: 'PG사 거래 ID', example: 'imp_1234567890' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: '주문 ID', example: 'order-uuid-1234' })
  @IsString()
  orderId: string;
}
