import { createElement, type ReactElement } from "react";
import { LoadingCanvasContainer } from "./widget/LoadingCanvas.container";
import type { LoadingCanvasContainerProps } from "../typings/LoadingCanvasProps";
import "./ui/LoadingCanvas.css";

export function LoadingCanvas(props: LoadingCanvasContainerProps): ReactElement {
  const {
    truckSelection,
    transportOrders,
    session,
    canvasWidth = 1000,
    canvasHeight = 600,
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
