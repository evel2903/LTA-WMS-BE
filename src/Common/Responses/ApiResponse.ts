export type ApiError = {
  Code: string;
  Message: string;
  Details?: unknown;
};

export type ApiResponse<T> = {
  Success: boolean;
  Data?: T;
  Errors?: ApiError[];
};

export const OkResponse = <T>(data: T): ApiResponse<T> => {
  return { Success: true, Data: data };
};

export const ErrorResponse = (errors: ApiError[]): ApiResponse<never> => {
  return { Success: false, Errors: errors };
};
