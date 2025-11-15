// 복잡한 객체/배열 구조에서 모든 string | number | boolean 값 타입만 재귀적으로 추출해 하나로 합칩니다.
type ValueType = string | number | boolean;

export type Union<T> = 
    T extends ReadonlyArray<infer U>
    ? Union<U>
    : T extends { [key:string]:infer U}
        ? Union<U>
        : T extends ValueType
            ? T
            : never;