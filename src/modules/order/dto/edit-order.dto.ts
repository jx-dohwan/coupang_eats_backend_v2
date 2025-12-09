import { IsEnum } from 'class-validator';
import { OrderStatus } from '../../../common/type/common.interface';

export class EditOrderDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
