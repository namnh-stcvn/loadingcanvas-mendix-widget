import { ReactElement } from "react";
import { LoadingCanvasContainer } from "./widget/LoadingCanvas.container";

import { LoadingCanvasContainerProps } from "../typings/LoadingCanvasProps";

import "./ui/LoadingCanvas.css";

export function LoadingCanvas(props: LoadingCanvasContainerProps): ReactElement {
    const { trucks, transportOrders, session, canvasWidth = 1000, canvasHeight = 600, onSavePlan, onLoadPlan } = props;

    // trucks/session are plain GUID strings; transportOrders is a ListValue datasource
    const truckGuid = trucks;
    const orderGuids = (transportOrders?.items ?? []).map(item => item.id);
    const sessionGuid = session;

    return (
        <LoadingCanvasContainer
            trucks={truckGuid}
            transportOrders={orderGuids}
            session={sessionGuid}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            onSavePlan={() => onSavePlan?.execute()}
            onLoadPlan={() => onLoadPlan?.execute()}
        />
    );
}
