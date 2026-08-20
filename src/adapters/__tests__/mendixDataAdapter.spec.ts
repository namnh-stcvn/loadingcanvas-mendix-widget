import { describe, expect, it } from "@jest/globals";
import Big from "big.js";
import { filterByAssociationGuid, toBig } from "../mendixDataAdapter";

describe("mendixDataAdapter Decimal conversion", () => {
  it("always returns a Big.js value for Mendix Decimal attributes", () => {
    const value = toBig(0.7881818181818182);

    expect(value).toBeInstanceOf(Big);
    expect(value.toString()).toBe("0.7881818181818182");
  });

  it("rejects non-finite Decimal values before calling MxObject.set", () => {
    expect(() => toBig(Number.NaN)).toThrow("Cannot convert non-finite value");
    expect(() => toBig(Number.POSITIVE_INFINITY)).toThrow("Cannot convert non-finite value");
  });

  it("filters retrieved objects by their Mendix association without XPath constraints", () => {
    const matching = {
      get: (name: string): unknown => (name === "PackingPlan_TruckSelection" ? "truck-1" : undefined),
      getAttributes: (): string[] => [],
      set: (): void => undefined,
    };
    const other = {
      get: (): unknown => "truck-2",
      getAttributes: (): string[] => [],
      set: (): void => undefined,
    };

    expect(filterByAssociationGuid([matching, other], ["PackingPlan_TruckSelection"], "truck-1")).toEqual([matching]);
  });
});
