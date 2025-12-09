import { IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  transactionId: string;

  @IsString()
  orderId: string;
}
