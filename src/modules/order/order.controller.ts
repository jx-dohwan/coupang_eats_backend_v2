import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { AccessTokenGuard } from '../../core/guard/accessToken.guard';
import { RolesGuard } from '../../core/guard/roles.guard';
import { Roles } from '../../core/decorator/roles.decorator';
import { Role } from '../../entities/user/user.interface';
import { CurrentUser } from '../../core/decorator/currentUser.decorator';
import { User } from '../../entities/user/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { EditOrderDto } from './dto/edit-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.CLIENT)
  async createOrder(
    @CurrentUser() user: User,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(user, createOrderDto);
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  async getOrders(@CurrentUser() user: User) {
    return this.orderService.getOrders(user);
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  async getOrder(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orderService.getOrderById(user, id);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  async editOrder(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() editOrderDto: EditOrderDto,
  ) {
    return this.orderService.editOrderStatus(user, id, editOrderDto);
  }
}
