import { describe, expect, it } from "vitest";
import {
  buildBondCovenantAction,
  buildEvaluationAction,
  buildEvidenceAction,
  genToWei,
  metadataHash
} from "./actions";

describe("GenLayer contract action builders", () => {
  it("converts GEN amounts to wei strings", () => {
    expect(genToWei("1")).toBe("1000000000000000000");
    expect(genToWei("0.25")).toBe("250000000000000000");
  });

  it("builds bond, evidence, and evaluation payloads with stable method names", () => {
    expect(buildBondCovenantAction("covenant-1", "CREATOR", "100")).toEqual({
      functionName: "bond_covenant",
      args: ["covenant-1", "CREATOR"],
      value: "100"
    });

    expect(
      buildEvidenceAction({
        covenantId: "covenant-1",
        type: "STRUCTURED_METADATA",
        uri: "pacta:evidence:1",
        contentHash: "sha256:abc",
        metadataHash: "sha256:def"
      })
    ).toEqual({
      functionName: "submit_evidence",
      args: ["covenant-1", "STRUCTURED_METADATA", "pacta:evidence:1", "sha256:abc", "sha256:def"]
    });

    expect(buildEvaluationAction("covenant-1")).toEqual({
      functionName: "request_evaluation",
      args: ["covenant-1"]
    });
  });

  it("hashes metadata independently of object key order", async () => {
    await expect(metadataHash({ b: 2, a: { d: 4, c: 3 } })).resolves.toBe(
      await metadataHash({ a: { c: 3, d: 4 }, b: 2 })
    );
  });
});
