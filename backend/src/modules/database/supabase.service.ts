import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Injectable, InternalServerErrorException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SupabaseService {
  readonly admin: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const url = this.required("SUPABASE_URL");
    const serviceRoleKey = this.required("SUPABASE_SERVICE_ROLE_KEY");

    this.admin = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  required(name: string) {
    const value = this.config.get<string>(name);
    if (!value) {
      throw new ServiceUnavailableException(`${name} is not configured.`);
    }
    return value;
  }

  ensure<T>(data: T | null, error: { message: string } | null, context: string): T {
    if (error) {
      throw new InternalServerErrorException(`${context}: ${error.message}`);
    }
    if (data === null) {
      throw new InternalServerErrorException(`${context}: empty response`);
    }
    return data;
  }

  ensureArray<T>(data: T[] | null, error: { message: string } | null, context: string): T[] {
    if (error) {
      throw new InternalServerErrorException(`${context}: ${error.message}`);
    }
    return data ?? [];
  }

  throwIfError(error: { message: string } | null, context: string) {
    if (error) {
      throw new InternalServerErrorException(`${context}: ${error.message}`);
    }
  }
}
