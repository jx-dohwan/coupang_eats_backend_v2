import { ClassProvider, Global, Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiResponseInterceptor } from './interceptor/apiResponse.interceptor';
import { ErrorInterceptor } from './interceptor/error.interceptor';
import { TypeOrmModule } from './database/typeorm/typeorm.module';
import { LoggerModule } from './logger/logger.module';

// CoreModule이 공통으로 관리할 모듈 목록(설정, 로거)
const modules = [ConfigModule, LoggerModule];

// CoreModule이 제공할 프로바이더 목록 (현재는 비어 있음))
const providers: ClassProvider[] = [];

// 애플리케이션 전역으로 적용할 인터셉터 목록
const interceptor: ClassProvider[] = [
    // 1. API 응답 형식을  통일된 구조로 래핑하는 인터셉터
    {provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor},
    // 2. 에러 발생 시 응답 형식을 통일된 구조로 래핑하는 인터셉터
    {provide: APP_INTERCEPTOR, useClass: ErrorInterceptor},
];

// 애플리케이션 전역으로 적용할 예외 필터 목록(현재는 비어 있음)
const filters: ClassProvider[] = [];

/**
 * 
 */
@Global()
@Module({
    imports: [TypeOrmModule.forRoot(), ...modules],
    providers: [...providers, ...interceptor, ...filters],
    exports: [...modules, ...providers],
})
export class CoreModule {}