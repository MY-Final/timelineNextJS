import swaggerJsdoc from "swagger-jsdoc";
import { NextResponse } from "next/server";

const spec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Timeline API",
      version: "1.0.0",
      description: "时光轴项目后端接口文档",
    },
    servers: [{ url: "/", description: "当前服务" }],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "token",
        },
      },
      schemas: {
        ApiResponse: {
          type: "object",
          properties: {
            code: { type: "integer", example: 0 },
            message: { type: "string", example: "操作成功" },
            data: {},
            traceId: { type: "string" },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "认证相关" },
      { name: "Posts", description: "帖子管理" },
      { name: "Admin/Users", description: "用户管理" },
      { name: "Admin/EmailAccounts", description: "SMTP邮箱管理" },
      { name: "Health", description: "健康检测" },
    ],
  },
  apis: ["./app/api/**/*.ts"],
});

export async function GET() {
  return NextResponse.json(spec);
}
