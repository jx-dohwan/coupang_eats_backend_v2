import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CoreOutput } from '../../common/dto/core.output';
import { ErrorResponse } from '../../common/dto/error.response';

// 1. 단순 조회용 (GET) - 200 OK
export function ApiDocOk(summary: string, responseType?: Type<any>) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiOkResponse({
      description: '요청 성공',
      type: responseType || CoreOutput, // 타입 미지정 시 기본값
    }),
    // 공통 에러 응답 자동 추가
    ApiResponse({
      status: 400,
      description: '잘못된 요청',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: '서버 내부 오류',
      type: ErrorResponse,
    }),
  );
}

// 2. 생성/수정용(POST, PATCH, PUT) - 201 Created & 인증 필요
export function ApiDocCreated(summary: string, responseType?: Type<any>) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiBearerAuth('access-token'), // main.ts 설정과 이름 일치 필수
    ApiCreatedResponse({
      description: '생성/수정 성공',
      type: responseType || CoreOutput,
    }),
    ApiResponse({
      status: 400,
      description: '잘못된 요청',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 401,
      description: '인증 실패 (토큰 없음)',
      type: ErrorResponse,
    }),
    ApiResponse({ status: 403, description: '권한 없음', type: ErrorResponse }),
  );
}
