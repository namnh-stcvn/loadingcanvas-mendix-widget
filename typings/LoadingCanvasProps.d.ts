/**
 * This file was generated from LoadingCanvas.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { CSSProperties } from "react";
import { ActionValue, ListValue } from "mendix";

export interface TruckSelectionType {

}

export interface SessionType {

}

export interface TruckSelectionPreviewType {

}

export interface SessionPreviewType {

}

export interface LoadingCanvasContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    truckSelection: TruckSelectionType[];
    transportOrders?: ListValue;
    session: SessionType[];
    canvasWidth: number;
    canvasHeight: number;
    onSavePlan?: ActionValue;
    onLoadPlan?: ActionValue;
}

export interface LoadingCanvasPreviewProps {
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    truckSelection: TruckSelectionPreviewType[];
    transportOrders: {} | { caption: string } | { type: string } | null;
    session: SessionPreviewType[];
    canvasWidth: number | null;
    canvasHeight: number | null;
    onSavePlan: {} | null;
    onLoadPlan: {} | null;
}
