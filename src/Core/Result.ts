export type Result<T> =
  | { IsSuccess: true; Value: T }
  | { IsSuccess: false; ErrorCode: string; ErrorMessage: string; Details?: unknown };

export const Ok = <T>(value: T): Result<T> => {
  return { IsSuccess: true, Value: value };
};

export const Fail = (errorCode: string, errorMessage: string, details?: unknown): Result<never> => {
  return { IsSuccess: false, ErrorCode: errorCode, ErrorMessage: errorMessage, Details: details };
};
