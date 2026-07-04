import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function badRequest(message: string, details?: unknown) {
  return new HttpError(400, message, details);
}

export function unauthorized(message = "Unauthorized.") {
  return new HttpError(401, message);
}

export function forbidden(message = "Forbidden.") {
  return new HttpError(403, message);
}

export function notFound(message = "Not found.") {
  return new HttpError(404, message);
}

export function serviceUnavailable(message: string) {
  return new HttpError(503, message);
}

export function badGateway(message: string) {
  return new HttpError(502, message);
}

export async function withApi(handler: () => Promise<Response> | Response) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ message: error.message, details: error.details }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
