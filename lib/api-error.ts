import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { UnauthorizedError, ForbiddenError } from '@/lib/auth/session';

/**
 * API error response helpers.
 *
 * هدف: یک شکل استاندارد برای همه error responses در API:
 *   { error: string, code?: string, details?: unknown }
 *
 * استفاده در route handlers:
 *
 *   export async function POST(req: Request) {
 *     try {
 *       const session = await requireSession();
 *       const body = schema.parse(await req.json());
 *       // ...
 *       return NextResponse.json(result);
 *     } catch (e) {
 *       return handleError(e);
 *     }
 *   }
 */

interface ErrorBody {
  error: string;
  code?: string;
  details?: unknown;
}

export function handleError(error: unknown): NextResponse<ErrorBody> {
  // Zod validation errors → 400
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'داده‌های ورودی نامعتبر هستند',
        code: 'VALIDATION_ERROR',
        details: error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // Auth errors
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: 'احراز هویت لازم است', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: 'دسترسی غیرمجاز', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  // Custom domain errors (با code='NOT_FOUND' و غیره)
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
      },
      { status: error.status }
    );
  }

  // Database constraint violations
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json(
        { error: 'این داده قبلاً موجود است', code: 'DUPLICATE' },
        { status: 409 }
      );
    }
    if (msg.includes('foreign key') || msg.includes('violates')) {
      return NextResponse.json(
        {
          error: 'این رکورد دارای ارجاع‌های دیگری است و قابل حذف نیست',
          code: 'FOREIGN_KEY_VIOLATION',
        },
        { status: 409 }
      );
    }
  }

  // Unknown error — log و generic message
  console.error('Unhandled API error:', error);
  return NextResponse.json(
    { error: 'خطای داخلی سرور', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}

/**
 * Custom error class برای domain-specific errors.
 *
 * مثال:
 *   throw new ApiError(404, 'تراکنش پیدا نشد', 'TX_NOT_FOUND');
 *   throw new ApiError(409, 'تراکنش قبلاً تایید شده', 'INVALID_STATE');
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    status: number,
    message: string,
    code: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
