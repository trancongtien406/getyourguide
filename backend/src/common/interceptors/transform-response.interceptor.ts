import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    ApiResponse,
    PaginatedResult,
} from '../interfaces/api-response.interface';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<ApiResponse<T>> {
    return next
      .handle()
      .pipe(
        map((responseData: unknown) => this.normalizeResponse(responseData)),
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

  private normalizeResponse(responseData: unknown): ApiResponse<T> {
    if (this.isApiResponse(responseData)) {
      return responseData;
    }

    if (this.isPaginatedResult(responseData)) {
      const pageSize = responseData.pageSize ?? 20;
      const page = responseData.page ?? 1;
      const extra = this.getPaginationExtraFields(responseData);

      return {
        success: true,
        data: responseData.items as T,
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

    if (this.isMessageOnlyResponse(responseData)) {
      return {
        success: true,
        message: responseData.message,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      data: responseData as T,
      timestamp: new Date().toISOString(),
    };
  }

  private isApiResponse(data: unknown): data is ApiResponse<T> {
    if (!this.isRecord(data)) {
      return false;
    }

    return (
      typeof data.success === 'boolean' && typeof data.timestamp === 'string'
    );
  }

  private isMessageOnlyResponse(data: unknown): data is { message: string } {
    if (!this.isRecord(data)) {
      return false;
    }

    return Object.keys(data).length === 1 && typeof data.message === 'string';
  }

  private getPaginationExtraFields(
    data: PaginatedResult<unknown>,
  ): Record<string, unknown> {
    const record = data as unknown as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(record).filter(
        ([key]) =>
          key !== 'page' &&
          key !== 'pageSize' &&
          key !== 'total' &&
          key !== 'items',
      ),
    );
  }

  private isRecord(data: unknown): data is Record<string, unknown> {
    return data !== null && typeof data === 'object';
  }
}
