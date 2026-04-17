import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getRedis } from "@/lib/redis";
import { successResponse, errorResponse, ResultCode } from "@/lib/result";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/health/redis:
 *   get:
 *     summary: 检测 Redis 连接状态
 *     tags: [Health]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Redis 连接正常
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     status: { type: string, example: ok }
 *                     latency_ms: { type: number, example: 2 }
 *       503:
 *         description: Redis 连接失败
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "superadmin") return errorResponse(ResultCode.FORBIDDEN, "无权操作");

  try {
    const redis = getRedis();
    const start = Date.now();
    const pong = await redis.ping();
    const latency = Date.now() - start;
    if (pong !== "PONG") throw new Error("Unexpected ping response");
    return successResponse({ status: "ok", latency_ms: latency }, "Redis 连接正常");
  } catch (err) {
    const message = err instanceof Error ? err.message : "连接失败";
    return NextResponse.json(
      { code: ResultCode.INTERNAL_ERROR, message: `Redis 不可用：${message}`, data: null },
      { status: 503 }
    );
  }
}
