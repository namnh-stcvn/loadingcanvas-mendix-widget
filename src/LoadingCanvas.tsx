import { createElement, type ReactElement } from "react";
import { LoadingCanvasContainer } from "./widget/LoadingCanvas.container";
import type { LoadingCanvasContainerProps } from "../typings/LoadingCanvasProps";
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from "./constants/canvas";
import "./ui/LoadingCanvas.css";

export function LoadingCanvas(props: LoadingCanvasContainerProps): ReactElement {
  const {
    truckSelection,
    transportOrders,
    session,
    canvasWidth = DEFAULT_CANVAS_WIDTH,
    canvasHeight = DEFAULT_CANVAS_HEIGHT,
    onSavePlan,
    onLoadPlan,
  } = props;

  const truckItems = truckSelection?.items?.map((item) => item.id) ?? [];
  const orderGuids = transportOrders?.items?.map((item) => item.id) ?? [];
  const sessionItems = session?.items?.map((item) => item.id) ?? [];

  return createElement(LoadingCanvasContainer, {
    truckSelection: truckItems,
    transportOrders: orderGuids,
    session: sessionItems,
    canvasWidth,
    canvasHeight,
    onSavePlan: () => onSavePlan?.execute(),
    onLoadPlan: () => onLoadPlan?.execute(),
  });
}
