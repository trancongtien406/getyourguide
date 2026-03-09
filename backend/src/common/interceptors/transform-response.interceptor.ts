import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PaginatedResult } from '../interfaces/api-response.interface';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((responseData) => {
        // If response is already in ApiResponse format, return as is
        if (responseData && typeof responseData === 'object' && 'success' in responseData && 'timestamp' in responseData) {
          return responseData;
        }

        // Handle paginated responses
        if (this.isPaginatedResult(responseData)) {
          const pageSize = responseData.pageSize ?? 20;
          const page = responseData.page ?? 1;
          // Preserve any extra fields (e.g. averageRating, publishedCount)
          const { page: _p, pageSize: _ps, total: _t, items: _i, ...extra } = responseData as unknown as Record<string, unknown>;
          return {
            success: true,
            data: responseData.items,
            meta: {
              page,
              pageSize,
              total: responseData.total,
              totalPages: Math.ceil(responseData.total / pageSize),
              ...extra,
            },
            timestamp: new Date().toISOString(),
          };
        }

        // Handle message-only responses
        if (responseData && typeof responseData === 'object' && 'message' in responseData && Object.keys(responseData).length === 1) {
          return {
            success: true,
            message: responseData.message,
            timestamp: new Date().toISOString(),
          };
        }

        // Standard response
        return {
          success: true,
          data: responseData,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }

  private isPaginatedResult(data: unknown): data is PaginatedResult<unknown> {
    return (
      data !== null &&
      typeof data === 'object' &&
      'items' in data &&
      'total' in data &&
      ('page' in data || 'pageSize' in data) &&
      Array.isArray((data as PaginatedResult<unknown>).items)
    );
  }
}
