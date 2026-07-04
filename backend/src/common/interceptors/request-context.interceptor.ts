import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Observable } from "rxjs";

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();
    const headerValue = request.headers?.["x-request-id"];
    const requestId = typeof headerValue === "string" && headerValue.length <= 128 ? headerValue : randomUUID();

    request.id = requestId;
    response.setHeader("x-request-id", requestId);

    return next.handle();
  }
}
