export interface SuccessResponse<T> {
    reasonCode: string;
    message: string;
    data: T;
}

export interface ErrorResponse {
    reasonCode: string;
    message: string;
    error: any;
}