/**
 * This file was generated from LoadingCanvas.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { ActionValue, ListValue } from "mendix";
import { CSSProperties } from "react";

export interface LoadingCanvasContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    trucks: string;
    transportOrders?: ListValue;
    session: string;
    canvasWidth?: number;
    canvasHeight?: number;
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
    trucks: string;
    transportOrders: {} | { caption: string } | { type: string } | null;
    session: string;
    canvasWidth: number | null;
    canvasHeight: number | null;
    onSavePlan: {} | null;
    onLoadPlan: {} | null;
}
