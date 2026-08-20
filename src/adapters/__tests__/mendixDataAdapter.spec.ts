import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import Big from "big.js";
import { filterByAssociationGuid, savePackingPlan, toBig } from "../mendixDataAdapter";
import type { CanvasState } from "../../state/CanvasState";

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

describe("savePackingPlan Decimal constructor fallback", () => {
  const originalMx = (globalThis as { mx?: unknown }).mx;

  const makeDecimal = (value: number) => ({
    toNumber: () => value,
    toString: () => String(value),
    constructor: class MockDecimal {
      v: number | string;
      constructor(value: number | string) {
        this.v = value;
      }
      toNumber = () => Number(this.v);
      toString = () => String(this.v);
    },
  });

  const makeMxObject = (guid: string, attrs: Record<string, unknown>) => ({
    get: (name: string): unknown => attrs[name] ?? null,
    set: (name: string, value: unknown): void => {
      attrs[name] = value;
    },
    getAttributes: (): string[] => Object.keys(attrs),
    getGuid: (): string => guid,
  });

  const makePlanItemObject = (guid: string) => {
    const attrs: Record<string, unknown> = {
      PositionX: makeDecimal(0),
      PositionY: makeDecimal(0),
      Width: makeDecimal(1.2),
      Height: makeDecimal(0.8),
      HeightMeters: null,
      WeightKg: null,
    };
    return makeMxObject(guid, attrs);
  };

  beforeEach(() => {
    const planObj = makeMxObject("plan-1", {
      TCSLoadingMeter$PackingPlan_TruckSelection: "truck-1",
    });
    const existingItem = makeMxObject("item-old-1", {
      TCSLoadingMeter$PackingPlanItem_PackingPlan: "plan-1",
    });

    const mxData = {
      get: jest.fn((options: { xpath?: string; callback: (result: unknown) => void }) => {
        if (options.xpath === "//TCSLoadingMeter.PackingPlan") {
          options.callback([planObj]);
        } else if (options.xpath === "//TCSLoadingMeter.PackingPlanItem") {
          options.callback([existingItem]);
        } else {
          options.callback([]);
        }
      }),
      create: jest.fn((options: { entity: string; callback: (obj: unknown) => void }) => {
        if (options.entity === "TCSLoadingMeter.PackingPlanItem") {
          options.callback(makePlanItemObject(`item-new-${Math.random()}`));
        } else {
          options.callback(makeMxObject("plan-new", {}));
        }
      }),
      remove: jest.fn((options: { callback?: () => void }) => options.callback?.()),
      commit: jest.fn((options: { callback?: () => void }) => options.callback?.()),
      action: jest.fn(),
      rollback: jest.fn(),
    };

    (globalThis as { mx?: unknown }).mx = { data: mxData };
  });

  afterEach(() => {
    (globalThis as { mx?: unknown }).mx = originalMx;
  });

  it("borrows the Decimal constructor from another attribute when HeightMeters has no default value", async () => {
    const state: CanvasState = {
      trailer: null,
      cargos: [
        {
          id: "cargo-1",
          name: "Cargo 1",
          type: "pallet",
          x: 0,
          y: 0,
          width: 1.2,
          height: 0.8,
          rotation: 0,
          color: "gray",
          isLocked: false,
          heightM: 1.6,
          weightKg: 500,
        },
      ],
      selectedIds: [],
      activeItemId: null,
      validation: { valid: true, errors: [] },
      scale: 1,
    };

    const result = await savePackingPlan("truck-1", state, 1);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].heightM).toBe(1.6);
  });
});
