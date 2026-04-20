import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// ─────────────────────────────────────────────
// 业务错误码约定
// 0     成功
// 400xx 客户端参数错误
// 401xx 认证失败
// 403xx 权限不足
// 404xx 资源不存在
// 500xx 服务端错误
// ─────────────────────────────────────────────
export const ResultCode = {
  SUCCESS: 0,
  BAD_REQUEST: 40000,
  UNAUTHORIZED: 40100,
  FORBIDDEN: 40300,
  NOT_FOUND: 40400,
  TOO_MANY_REQUESTS: 42900,
  INTERNAL_ERROR: 50000,
  DB_ERROR: 50001,
  UPSTREAM_ERROR: 50200,
} as const;

export type ResultCodeType = (typeof ResultCode)[keyof typeof ResultCode];

export interface Result<T = null> {
  code: ResultCodeType | number;
  message: string;
  data: T | null;
  traceId: string;
  businessId?: string;
}

// ── 构造函数 ──────────────────────────────────

export function ok<T>(data: T, message = '操作成功', businessId?: string): Result<T> {
  return { code: ResultCode.SUCCESS, message, data, traceId: randomUUID(), businessId };
}

export function fail(
  code: ResultCodeType | number,
  message: string,
  businessId?: string
): Result<null> {
  return { code, message, data: null, traceId: randomUUID(), businessId };
}

// ── NextResponse 快捷方法 ─────────────────────

const HTTP_STATUS: Record<number, number> = {
  [ResultCode.SUCCESS]: 200,
  [ResultCode.BAD_REQUEST]: 400,
  [ResultCode.UNAUTHORIZED]: 401,
  [ResultCode.FORBIDDEN]: 403,
  [ResultCode.NOT_FOUND]: 404,
  [ResultCode.TOO_MANY_REQUESTS]: 429,
  [ResultCode.INTERNAL_ERROR]: 500,
  [ResultCode.DB_ERROR]: 500,
  [ResultCode.UPSTREAM_ERROR]: 502,
};

export function successResponse<T>(data: T, message = '操作成功', businessId?: string) {
  return NextResponse.json(ok(data, message, businessId), { status: 200 });
}

export function errorResponse(
  code: ResultCodeType | number,
  message: string,
  businessId?: string
) {
  const httpStatus = HTTP_STATUS[code] ?? 500;
  return NextResponse.json(fail(code, message, businessId), { status: httpStatus });
}
