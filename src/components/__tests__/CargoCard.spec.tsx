import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { CargoItem } from "../../viewModels/CargoItem";
import { CargoCard } from "../CargoCard";

const makeItem = (overrides: Partial<CargoItem> = {}): CargoItem => ({
  id: "cargo-1",
  name: "Pallet A",
  type: "pallet",
  color: "#777788",
  isLocked: false,
  x: 10,
  y: 20,
  length: 120,
  width: 80,
  rotation: 0,
  transportOrderNo: "TO-001",
  productName: "Widget",
  producerName: "ProducerCo",
  companyFromName: "FromCo",
  companyToName: "ToCo",
  ...overrides,
});

const renderCard = (isPopupOpen: boolean) => {
  const item = makeItem();
  const onTogglePopup = jest.fn();
  const utils = render(
    <CargoCard
      item={item}
      isActive={false}
      selectedIds={[]}
      onMouseDown={(_e: ReactMouseEvent<HTMLDivElement>) => undefined}
      onRotate={(_itemId: string) => undefined}
      isPopupOpen={isPopupOpen}
      onTogglePopup={onTogglePopup}
      hasError={false}
    />
  );
  const card = utils.container.querySelector(`[data-id="${item.id}"]`);
  if (!card) {
    throw new Error("cargo card element not found");
  }
  return { ...utils, onTogglePopup, card };
};

describe("CargoCard popup interaction", () => {
  it("does not toggle the popup on a single click", () => {
    const { card, onTogglePopup } = renderCard(false);
    fireEvent.click(card);
    expect(onTogglePopup).not.toHaveBeenCalled();
  });

  it("toggles the popup on double click", () => {
    const { card, onTogglePopup } = renderCard(false);
    fireEvent.dblClick(card);
    expect(onTogglePopup).toHaveBeenCalledTimes(1);
  });

  it("shows the popup when isPopupOpen is true", () => {
    const { getAllByText } = renderCard(true);
    // Label/value are split across <span> + text node, so match the row by its full textContent.
    expect(getAllByText((_content, element) => element?.textContent === "From:FromCo").length).toBeGreaterThan(0);
  });

  it("hides the popup when isPopupOpen is false", () => {
    const { queryAllByText } = renderCard(false);
    expect(queryAllByText((_content, element) => element?.textContent === "From:FromCo").length).toBe(0);
  });
});
