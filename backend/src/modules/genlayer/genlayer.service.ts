import { BadGatewayException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isAddress } from "viem";
import { ContractEventsService } from "../contract-events/contract-events.service";
import { SyncContractEventsDto } from "./dto/sync-contract-events.dto";

type GenLayerClient = {
  readContract: (params: { address: string; functionName: string; args: unknown[] }) => Promise<unknown>;
};

type GenLayerChain = {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: { default: { http: readonly string[] } };
};

@Injectable()
export class GenLayerService {
  private clientPromise?: Promise<GenLayerClient>;

  constructor(
    private readonly config: ConfigService,
    private readonly contractEvents: ContractEventsService
  ) {}

  getPublicConfig() {
    return {
      network: this.network,
      contractAddress: this.contractAddress,
      rpcUrl: this.rpcUrlForNetwork(),
      rpcUrlConfigured: Boolean(this.config.get<string>("GENLAYER_RPC_URL"))
    };
  }

  async readJsonContractView(functionName: string, args: unknown[] = []) {
    const raw = await this.readContract(functionName, args);
    if (typeof raw !== "string") {
      throw new BadGatewayException(`Expected ${functionName} to return a JSON string.`);
    }

    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new BadGatewayException(`Could not parse ${functionName} JSON response.`);
    }
  }

  async syncContractEvents(dto: SyncContractEventsDto) {
    const eventCount = this.toNumber(await this.readContract("get_event_count", []), "get_event_count");
    const limit = dto.limit ?? 25;
    const start = dto.fromEventId ?? Math.max(1, eventCount - limit + 1);
    const end = Math.min(eventCount, start + limit - 1);
    const synced: Array<{ eventId: number; eventName: string }> = [];

    for (let eventId = start; eventId <= end; eventId += 1) {
      const event = await this.readJsonContractView("get_event", [eventId]);
      const eventName = this.readString(event, "event_type");
      await this.contractEvents.ingestPactaContractEvent(event, "genlayer-studionet");
      synced.push({ eventId, eventName });
    }

    return {
      contractAddress: this.contractAddress,
      network: this.network,
      eventCount,
      fromEventId: start,
      toEventId: end,
      synced
    };
  }

  async readContract(functionName: string, args: unknown[] = []) {
    const client = await this.getClient();
    try {
      const value = await client.readContract({
        address: this.contractAddress,
        functionName,
        args
      });
      return this.normalizeForJson(value);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadGatewayException(`GenLayer read failed for ${functionName}: ${message}`);
    }
  }

  private async getClient(): Promise<GenLayerClient> {
    if (!this.clientPromise) {
      this.clientPromise = this.createClient();
    }
    return this.clientPromise;
  }

  private async createClient(): Promise<GenLayerClient> {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
    const genlayer = (await dynamicImport("genlayer-js")) as {
      createAccount: () => unknown;
      createClient: (params: Record<string, unknown>) => GenLayerClient;
    };
    const chains = (await dynamicImport("genlayer-js/chains")) as Record<string, unknown>;
    const chain = this.resolveChain(chains);

    return genlayer.createClient({
      chain,
      endpoint: this.rpcUrlForNetwork(),
      account: genlayer.createAccount()
    });
  }

  private resolveChain(chains: Record<string, unknown>): GenLayerChain {
    const sdkChain = chains[this.network] ?? chains.simulator;
    if (this.network !== "studionet" && sdkChain) {
      return sdkChain as GenLayerChain;
    }

    if (this.network === "studionet") {
      return this.buildChain("GenLayer StudioNet", this.rpcUrlForNetwork());
    }

    if (this.network === "localnet") {
      return this.buildChain("GenLayer Localnet", this.rpcUrlForNetwork());
    }

    if (sdkChain) {
      return sdkChain as GenLayerChain;
    }

    throw new ServiceUnavailableException(`Unsupported GenLayer network: ${this.network}`);
  }

  private buildChain(name: string, rpcUrl: string): GenLayerChain {
    return {
      id: 61999,
      name,
      nativeCurrency: {
        name: "GEN",
        symbol: "GEN",
        decimals: 18
      },
      rpcUrls: {
        default: {
          http: [rpcUrl]
        }
      }
    };
  }

  private get network() {
    return this.config.get<string>("GENLAYER_NETWORK") ?? "studionet";
  }

  private get contractAddress() {
    const address = this.config.get<string>("GENLAYER_CONTRACT_ADDRESS") ?? "0x6a7d7807612a5485e83E53c776fcfe35fE685C59";
    if (!isAddress(address)) {
      throw new ServiceUnavailableException("GENLAYER_CONTRACT_ADDRESS is not a valid address.");
    }
    return address;
  }

  private rpcUrlForNetwork() {
    const configured = this.config.get<string>("GENLAYER_RPC_URL");
    if (configured) {
      return configured;
    }

    if (this.network === "localnet") {
      return "http://localhost:4000/api";
    }

    return "https://studio.genlayer.com/api";
  }

  private toNumber(value: unknown, label: string) {
    const normalized = this.normalizeForJson(value);
    const numberValue =
      typeof normalized === "number"
        ? normalized
        : typeof normalized === "string"
          ? Number(normalized)
          : Number.NaN;

    if (!Number.isInteger(numberValue) || numberValue < 0) {
      throw new BadGatewayException(`${label} returned a non-integer value.`);
    }

    return numberValue;
  }

  private readString(value: Record<string, unknown>, key: string) {
    const result = value[key];
    if (typeof result !== "string" || result.length === 0) {
      throw new BadGatewayException(`Contract event is missing ${key}.`);
    }
    return result;
  }

  private normalizeForJson(value: unknown): unknown {
    if (typeof value === "bigint") {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeForJson(item));
    }

    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, this.normalizeForJson(item)])
      );
    }

    return value;
  }
}
