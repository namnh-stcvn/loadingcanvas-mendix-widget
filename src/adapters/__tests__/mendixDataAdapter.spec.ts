import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import Big from "big.js";
import {
  extractTransportOrderData,
  filterByAssociationGuid,
  getReferenceGuids,
  loadCargoItems,
  loadPackingPlan,
  savePackingPlan,
  toBig,
} from "../mendixDataAdapter";
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

describe("extractTransportOrderData name fallback", () => {
  it("uses TransportOrderNo when no display name attribute exists", () => {
    const data = extractTransportOrderData({ TransportOrderNo: "TO-123" }, "order-guid-1");
    expect(data?.name).toBe("TO-123");
  });

  it("falls back to Cargo + guid when nothing else is available", () => {
    const data = extractTransportOrderData({}, "order-guid-1");
    expect(data?.name).toBe("Cargo order-guid-1");
  });
});

describe("getReferenceGuids", () => {
  const makeObj = (attrs: Record<string, unknown>) => ({
    get: (name: string): unknown => (name in attrs ? attrs[name] : null),
    set: (): void => undefined,
    getAttributes: (): string[] => Object.keys(attrs),
  });

  it("reads reference sets (GUID arrays)", () => {
    const obj = makeObj({ "TCSTransportModule.TransportOrder_PackingUnit": ["pu-1", "pu-2"] });
    expect(getReferenceGuids(obj, ["TCSTransportModule.TransportOrder_PackingUnit"])).toEqual(["pu-1", "pu-2"]);
  });

  it("reads single references and tries the next candidate when one is missing", () => {
    const obj = makeObj({ TransportOrder_PackingUnit: "pu-9" });
    expect(
      getReferenceGuids(obj, ["TCSTransportModule.TransportOrder_PackingUnit", "TransportOrder_PackingUnit"])
    ).toEqual(["pu-9"]);
  });

  it("returns an empty list for non-MxObject inputs", () => {
    expect(getReferenceGuids({ foo: 1 }, ["Some.Assoc"])).toEqual([]);
  });
});

describe("loadCargoItems PackingUnit enrichment", () => {
  const originalMx = (globalThis as { mx?: unknown }).mx;

  afterEach(() => {
    (globalThis as { mx?: unknown }).mx = originalMx;
  });

  it("resolves name, dimensions and packing type from the associated PackingUnit", async () => {
    const orderObj = {
      get: (name: string): unknown => (name === "TCSTransportModule.TransportOrder_PackingUnit" ? ["pu-guid-1"] : null),
      set: (): void => undefined,
      getAttributes: (): string[] => [],
      getGuid: (): string => "order-guid-1",
    };
    const unitAttrs: Record<string, unknown> = {
      Name: "EU Pallet",
      Length: { toNumber: () => 1.2 },
      Width: { toNumber: () => 0.8 },
    };
    const unitObj = {
      get: (name: string): unknown =>
        name === "DataModelModule.PackingUnit_PackingType" ? "pt-guid-1" : (unitAttrs[name] ?? null),
      set: (): void => undefined,
      getAttributes: (): string[] => Object.keys(unitAttrs),
      getGuid: (): string => "pu-guid-1",
    };
    const typeAttrs: Record<string, unknown> = { E_PackingType: "Box" };
    const typeObj = {
      get: (name: string): unknown => (name in typeAttrs ? typeAttrs[name] : null),
      set: (): void => undefined,
      getAttributes: (): string[] => Object.keys(typeAttrs),
      getGuid: (): string => "pt-guid-1",
    };

    const registry: Record<string, unknown> = {
      "order-guid-1": orderObj,
      "pu-guid-1": unitObj,
      "pt-guid-1": typeObj,
    };
    (globalThis as { mx?: unknown }).mx = {
      data: {
        get: jest.fn((options: { guids?: string[]; callback: (result: unknown) => void }) => {
          const requested = options.guids ?? [];
          options.callback(requested.map((guid) => registry[guid]).filter(Boolean));
        }),
      },
    };

    const items = await loadCargoItems(["order-guid-1"], { widthScale: 50, heightScale: 50 });

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("cargo-order-guid-1");
    expect(items[0].name).toBe("EU Pallet");
    expect(items[0].length).toBe(60); // 1.2 * 50
    expect(items[0].width).toBe(40); // 0.8 * 50
    expect(items[0].type).toBe("box");
    expect(items[0].color).toBe("blue");
  });

  it("resolves transportOrderNo, productName and Company names (Producer/From/To) popup meta from TransportOrder references", async () => {
    const orderObj = {
      get: (name: string): unknown => {
        if (name === "TCSTransportModule.TransportOrder_PackingUnit") {
          return ["pu-guid-1"];
        }
        if (name === "TCSTransportModule.TransportOrder_Product") {
          return ["product-guid-1"];
        }
        if (name === "TCSTransportModule.TransportOrder_Producer") {
          return ["producer-guid-1"];
        }
        if (name === "TCSTransportModule.TransportOrder_Company_From") {
          return ["from-guid-1"];
        }
        if (name === "TCSTransportModule.TransportOrder_Company_To") {
          return ["to-guid-1"];
        }
        if (name === "TransportOrderNo") {
          return "TO-777";
        }
        return null;
      },
      set: (): void => undefined,
      getAttributes: (): string[] => ["TransportOrderNo"],
      getGuid: (): string => "order-guid-1",
    };
    const unitObj = {
      get: (name: string): unknown =>
        name === "Length" ? { toNumber: () => 1.2 } : name === "Width" ? { toNumber: () => 0.8 } : null,
      set: (): void => undefined,
      getAttributes: (): string[] => ["Length", "Width"],
      getGuid: (): string => "pu-guid-1",
    };
    const productObj = {
      get: (name: string): unknown => (name === "Name" ? "Steel Coil" : null),
      set: (): void => undefined,
      getAttributes: (): string[] => ["Name"],
      getGuid: (): string => "product-guid-1",
    };
    const companyObj = (guid: string, companyName: string) => ({
      get: (name: string): unknown => (name === "Name" ? companyName : null),
      set: (): void => undefined,
      getAttributes: (): string[] => ["Name"],
      getGuid: (): string => guid,
    });

    const registry: Record<string, unknown> = {
      "order-guid-1": orderObj,
      "pu-guid-1": unitObj,
      "product-guid-1": productObj,
      "producer-guid-1": companyObj("producer-guid-1", "Producer Co"),
      "from-guid-1": companyObj("from-guid-1", "From Co"),
      "to-guid-1": companyObj("to-guid-1", "To Co"),
    };
    (globalThis as { mx?: unknown }).mx = {
      data: {
        get: jest.fn((options: { guids?: string[]; callback: (result: unknown) => void }) => {
          const requested = options.guids ?? [];
          options.callback(requested.map((guid) => registry[guid]).filter(Boolean));
        }),
      },
    };

    const items = await loadCargoItems(["order-guid-1"], { widthScale: 50, heightScale: 50 });

    expect(items).toHaveLength(1);
    expect(items[0].transportOrderNo).toBe("TO-777");
    expect(items[0].productName).toBe("Steel Coil");
    expect(items[0].producerName).toBe("Producer Co");
    expect(items[0].companyFromName).toBe("From Co");
    expect(items[0].companyToName).toBe("To Co");
  });

  it("pairs each order with its own PackingUnit even when the batch responds out of order", async () => {
    const makeType = (guid: string, enumValue: string) => ({
      get: (name: string): unknown => (name === "E_PackingType" ? enumValue : null),
      set: (): void => undefined,
      getAttributes: (): string[] => ["E_PackingType"],
      getGuid: (): string => guid,
    });
    const unitA = {
      get: (name: string): unknown =>
        name === "DataModelModule.PackingUnit_PackingType"
          ? "pt-guid-A"
          : (({ Name: "Pallet A", Length: { toNumber: () => 1.2 }, Width: { toNumber: () => 0.8 } } as never)[name] ??
            null),
      set: (): void => undefined,
      getAttributes: (): string[] => ["Name", "Length", "Width"],
      getGuid: (): string => "pu-guid-A",
    };
    const unitB = {
      get: (name: string): unknown =>
        name === "DataModelModule.PackingUnit_PackingType"
          ? "pt-guid-B"
          : (({ Name: "Box B", Length: { toNumber: () => 0.6 }, Width: { toNumber: () => 0.4 } } as never)[name] ??
            null),
      set: (): void => undefined,
      getAttributes: (): string[] => ["Name", "Length", "Width"],
      getGuid: (): string => "pu-guid-B",
    };
    const order = (guid: string, unitGuid: string) => ({
      get: (name: string): unknown => (name === "TCSTransportModule.TransportOrder_PackingUnit" ? [unitGuid] : null),
      set: (): void => undefined,
      getAttributes: (): string[] => [],
      getGuid: (): string => guid,
    });
    const registry: Record<string, unknown> = {
      "order-guid-1": order("order-guid-1", "pu-guid-A"),
      "order-guid-2": order("order-guid-2", "pu-guid-B"),
      "pu-guid-A": unitA,
      "pu-guid-B": unitB,
      "pt-guid-A": makeType("pt-guid-A", "Pallet"),
      "pt-guid-B": makeType("pt-guid-B", "Box"),
    };

    (globalThis as { mx?: unknown }).mx = {
      data: {
        // Deliberately reverse every response to prove no positional assumptions remain.
        get: jest.fn((options: { guids?: string[]; callback: (result: unknown) => void }) => {
          const requested = [...(options.guids ?? [])].reverse();
          options.callback(requested.map((guid) => registry[guid]).filter(Boolean));
        }),
      },
    };

    const items = await loadCargoItems(["order-guid-1", "order-guid-2"], { widthScale: 50, heightScale: 50 });

    expect(items).toHaveLength(2);
    const pallet = items.find((i) => i.id === "cargo-order-guid-1");
    const box = items.find((i) => i.id === "cargo-order-guid-2");
    expect(pallet).toMatchObject({ length: 60, width: 40, type: "pallet", color: "orange" });
    expect(box).toMatchObject({ length: 30, width: 20, type: "box", color: "blue" });
  });

  it("warns contextually before falling back to the item key when the TransportOrder association is unreadable", async () => {
    const originalConsoleWarn = console.warn;
    console.warn = jest.fn();
    try {
      const makeObj = (attrs: Record<string, unknown>, assoc: Record<string, unknown>) => ({
        get: (name: string): unknown => (name in assoc ? assoc[name] : (attrs[name] ?? null)),
        set: (): void => undefined,
        getAttributes: (): string[] => Object.keys(attrs),
      });
      const planObj = makeObj({ id: "plan-guid-1" }, { "TCSLoadingMeter.PackingPlan_TruckSelection": "truck-guid-1" });
      // Association read returns null -> resolution must degrade loudly, not silently.
      const itemObj = makeObj(
        { id: "item-key-7", PositionX: { toNumber: () => 1 }, PositionY: { toNumber: () => 1 } },
        { "TCSLoadingMeter.PackingPlanItem_PackingPlan": "plan-guid-1" }
      );

      (globalThis as { mx?: unknown }).mx = {
        data: {
          get: jest.fn((options: { guids?: string[]; xpath?: string; callback: (result: unknown) => void }) => {
            if (options.guids) {
              options.callback([]);
              return;
            }
            if (options.xpath?.includes("PackingPlanItem")) {
              options.callback([itemObj]);
              return;
            }
            options.callback([planObj]);
          }),
        },
      };

      const items = await loadPackingPlan("truck-guid-1", { widthScale: 50, heightScale: 50 });

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("cargo-item-key-7");
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("item-key-7"));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("no readable TransportOrder association"));
    } finally {
      console.warn = originalConsoleWarn;
    }
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
      Length: makeDecimal(1.2),
      Width: makeDecimal(0.8),
      Height: makeDecimal(0.8),
      LengthMeters: null,
      WidthMeters: null,
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

  it("borrows the Decimal constructor from another attribute when LengthMeters has no default value", async () => {
    const state: CanvasState = {
      truck: null,
      cargos: [
        {
          id: "cargo-1",
          name: "Cargo 1",
          type: "pallet",
          x: 0,
          y: 0,
          length: 1.2,
          width: 0.8,
          rotation: 0,
          color: "gray",
          isLocked: false,
          lengthM: 1.2,
          widthM: 0.8,
          weightKg: 500,
        },
      ],
      selectedIds: [],
      activeItemId: null,
      validation: { valid: true, errors: [] },
      scale: { widthScale: 1, heightScale: 1 },
    };

    const result = await savePackingPlan("truck-1", state, { widthScale: 1, heightScale: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].lengthM).toBe(1.2);
    expect(result.items[0].widthM).toBe(0.8);
  });
});
