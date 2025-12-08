import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { CoreModule } from './core/core.module';
import { RequestLoggerMiddleware } from './core/middleware/requestLogger.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { Module } from '@nestjs/common';
import { CategoryModule } from './modules/category/category.module';
import { DishModule } from './modules/dish/dish.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';

const applicationModules = [
  UserModule,
  AuthModule,
  CategoryModule,
  DishModule,
  RestaurantModule,
];

@Module({
  imports: [CoreModule, ...applicationModules],
  controllers: [],
  providers: [],
})
export class AppModule {}
