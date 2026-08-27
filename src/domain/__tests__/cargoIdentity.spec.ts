import { describe, it, expect } from "@jest/globals";
import { CARGO_ID_PREFIX, fromCargoId, toCargoId } from "../cargoIdentity";

describe("cargoIdentity", () => {
  const guid = "17169973584497070";

  it("exposes the shared prefix constant", () => {
    expect(CARGO_ID_PREFIX).toBe("cargo-");
  });

  describe("toCargoId", () => {
    it("adds the prefix to a bare GUID", () => {
      expect(toCargoId(guid)).toBe(`cargo-${guid}`);
    });

    it("leaves an already prefixed id unchanged", () => {
      expect(toCargoId(`cargo-${guid}`)).toBe(`cargo-${guid}`);
    });
  });

  describe("fromCargoId", () => {
    it("strips the prefix from a canvas id", () => {
      expect(fromCargoId(`cargo-${guid}`)).toBe(guid);
    });

    it("leaves a bare GUID unchanged", () => {
      expect(fromCargoId(guid)).toBe(guid);
    });
  });

  it("round-trips ids in both directions", () => {
    expect(fromCargoId(toCargoId(guid))).toBe(guid);
    expect(toCargoId(fromCargoId(`cargo-${guid}`))).toBe(`cargo-${guid}`);
  });
});
