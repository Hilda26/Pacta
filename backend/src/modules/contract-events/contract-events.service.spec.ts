import { BadRequestException } from "@nestjs/common";
import { ContractEventsService } from "./contract-events.service";

function createService() {
  const db = {
    admin: {
      from: jest.fn((table: string) => {
        if (table === "contract_events") {
          return {
            upsert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: { id: "event-1" }, error: null })
              }))
            }))
          };
        }
        if (table === "covenants") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: { creator_id: "user-1" }, error: null })
              }))
            }))
          };
        }
        return {};
      }),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null })
    },
    ensure: jest.fn((data, error) => {
      if (error) {
        throw new Error(error.message);
      }
      return data;
    }),
    throwIfError: jest.fn((error) => {
      if (error) {
        throw new Error(error.message);
      }
    })
  };
  const audit = {
    record: jest.fn().mockResolvedValue(undefined)
  };
  return {
    db,
    audit,
    service: new ContractEventsService(audit as any, db as any)
  };
}

describe("ContractEventsService", () => {
  it("persists and applies Pacta covenant evaluation events", async () => {
    const { db, service } = createService();

    await service.ingestPactaContractEvent(
      {
        event_id: 7,
        event_type: "CovenantEvaluated",
        covenant_id: "covenant-1",
        payload: {
          outcome: "FULFILLED",
          confidence: 92,
          reasoning: "Evidence satisfies the covenant.",
          bondDistribution: { returnBps: 10000, slashBps: 0 },
          reputationImpact: { delta: 19 }
        }
      },
      "test"
    );

    expect(db.admin.rpc).toHaveBeenCalledWith(
      "pacta_apply_covenant_evaluated",
      expect.objectContaining({
        p_covenant_id: "covenant-1",
        p_outcome: "FULFILLED",
        p_confidence: 92,
        p_reputation_delta: 19
      })
    );
  });

  it("rejects malformed evaluation confidence", async () => {
    const { service } = createService();

    await expect(
      service.ingestPactaContractEvent(
        {
          event_id: 8,
          event_type: "CovenantEvaluated",
          covenant_id: "covenant-1",
          payload: {
            outcome: "BROKEN",
            confidence: 200,
            reasoning: "Invalid confidence."
          }
        },
        "test"
      )
    ).rejects.toThrow(BadRequestException);
  });
});
