export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ResponseUtil {
  static success<T>(data: T, message = 'Success', reasonCode = '00') {
    return {
      reasonCode,
      message,
      data,
    };
  }

  static error(message = 'Error', reasonCode = 'ERROR', error: any = null) {
    return {
      reasonCode,
      message,
      ...(error && { errors: error }), // ✅ FIX
    };
  }

  static successPagination<T>(
    items: T[],
    meta: PaginationMeta,
    message = 'Success',
    reasonCode = '00',
  ) {
    return {
      reasonCode,
      message,
      data: items,
      meta,
    };
  }
}
