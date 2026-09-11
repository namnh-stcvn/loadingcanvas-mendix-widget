import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react";
import type { DragEvent } from "react";
import type { CargoItem } from "../../../core/types/viewModels/CargoItem";
import { CargoList } from "../CargoList";

const makeItem = (overrides: Partial<CargoItem> = {}): CargoItem => ({
  id: "cargo-GUID-1",
  name: "Pallet A",
  type: "pallet",
  color: "#777788",
  isLocked: false,
  x: 10,
  y: 20,
  length: 120,
  width: 80,
  rotation: 0,
  quantity: 1,
  ...overrides,
});

const makeDataTransfer = () => ({
  setData: jest.fn(),
  getData: jest.fn(),
  effectAllowed: "none",
  dropEffect: "none",
});

const renderList = (
  availableItems: CargoItem[],
  onRemoveCargo?: (baseId: string) => void,
  onParentDrop?: (e: DragEvent<HTMLDivElement>) => void
) => {
  const utils = render(
    <div
      onDrop={
        onParentDrop ??
        ((e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
        })
      }>
      <CargoList
        availableItems={availableItems}
        onAddCargo={jest.fn()}
        onRemoveCargo={onRemoveCargo}
        placedInstances={new Map()}
        numberStart={new Map()}
      />
    </div>
  );
  // CargoList's root element is the drop-zone panel; chip names live only in
  // title attributes, so locate the panel structurally.
  const list = utils.container.firstElementChild?.firstElementChild;
  if (!list) {
    throw new Error("cargo list panel not found");
  }
  return { ...utils, list };
};

describe("CargoList drop isolation", () => {
  it("stops propagation so the enclosing canvas drop zone is not triggered", () => {
    const parentDrop = jest.fn();
    const onRemoveCargo = jest.fn();
    const { list } = renderList([makeItem()], onRemoveCargo, parentDrop);

    const dataTransfer = { ...makeDataTransfer(), getData: jest.fn(() => "single:cargo-GUID-1-0") };
    fireEvent.drop(list, { dataTransfer });

    expect(onRemoveCargo).toHaveBeenCalledTimes(1);
    expect(onRemoveCargo).toHaveBeenCalledWith("GUID-1");
    expect(parentDrop).not.toHaveBeenCalled();
  });

  it("also stops dragover propagation to the canvas drop zone", () => {
    const onRemoveCargo = jest.fn();
    const { list } = renderList([makeItem()], onRemoveCargo);

    const dataTransfer = { ...makeDataTransfer() };
    fireEvent.dragOver(list, { dataTransfer });

    expect(dataTransfer.dropEffect).toBe("move");
    expect(onRemoveCargo).not.toHaveBeenCalled();
  });

  it("removes the base transport order id from a prefixed payload", () => {
    const onRemoveCargo = jest.fn();
    const { list } = renderList([makeItem()], onRemoveCargo);

    const dataTransfer = { ...makeDataTransfer(), getData: jest.fn(() => "single:cargo-GUID-7-2") };
    fireEvent.drop(list, { dataTransfer });

    expect(onRemoveCargo).toHaveBeenCalledWith("GUID-7");
  });

  it("does nothing when onRemoveCargo is not provided", () => {
    const { list } = renderList([makeItem()], undefined);

    const dataTransfer = { ...makeDataTransfer(), getData: jest.fn(() => "single:cargo-GUID-1-0") };
    expect(() => fireEvent.drop(list, { dataTransfer })).not.toThrow();
  });
});
