import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * 페이지네이션 요청 값이 없을 경우 사용할 기본값 정의
 */
export enum PaginationDefault {
  PAGE_DEFAULT = 1,
  LIMIT_DEFAULT = 10,
}

/**
 * 페이지네이션 요청 DTO 클래스
 * ?page=1&limit=10와 같은 쿼리 파라미터를 이 클래스 객체로 변환한다.
 */
export class PaginationRequest {
  @IsOptional() // 값이 없어도 에러 아님(기본값 사용)
  @Min(1) // 최소 1이상이어야 함
  @IsInt() // 정수여야함
  @Type(() => Number) // 쿼리 파라미터(문자열)를 숫자로 변환
  page = PaginationDefault.PAGE_DEFAULT; 

  @IsOptional()
  @Min(1)
  @IsInt()
  @Type(() => Number)
  limit = PaginationDefault.LIMIT_DEFAULT;

  /**
   * 해당 메서드는 현재 DTO의 page, limit과 DB에서 조회한 전체 개수(totalCount)를 알 때 '다음 페이지 여부'를 계산할 수 있는 헬퍼 함수이다.
   * @param totalCount 
   * @returns 
   */
  getHasNext(totalCount: number): boolean {
    return this.page * this.limit < totalCount;
  }
}
