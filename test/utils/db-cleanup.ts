import { DataSource } from 'typeorm';

export async function dbCleanup(dataSource: DataSource): Promise<void> {
  // DB 연결이 없으면 실행하지 않음
  if (!dataSource || !dataSource.isInitialized) {
    return;
  }

  try {
    // 1. 외래 키(Foreign Key) 제약 조건 잠시 해제
    // (이게 없으면 테이블 삭제 순서 때문에 에러가 발생합니다)
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0;');

    const entities = dataSource.entityMetadatas;

    // 2. 모든 테이블 순회하며 데이터 삭제 (TRUNCATE)
    for (const entity of entities) {
      const tableName = entity.tableName;

      // TRUNCATE는 DELETE보다 빠르며, Auto Increment(ID) 값도 1로 초기화해줍니다.
      // MySQL 예약어 충돌 방지를 위해 백틱(`)을 사용합니다.
      await dataSource.query(`TRUNCATE TABLE \`${tableName}\`;`);
    }
  } catch (error) {
    console.error('❌ DB Cleanup Error:', error);
    throw error;
  } finally {
    // 3. 외래 키 제약 조건 다시 활성화 (매우 중요)
    // 에러가 나더라도 이 코드는 반드시 실행되어야 DB가 정상 상태로 돌아옵니다.
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1;');
  }
}
