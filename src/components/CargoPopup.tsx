import type { FC, ReactElement } from "react";

interface CargoPopupProps {
  transportOrderNo?: string;
  productName?: string;
  producerName?: string;
  companyFromName?: string;
  companyToName?: string;
}

const Row = ({ label, value }: { label: string; value?: string }): ReactElement | null =>
  value ? (
    <div style={{ marginBottom: 2 }}>
      <span style={{ fontWeight: 600, marginRight: 6 }}>{label}:</span>
      {value}
    </div>
  ) : null;

// Double-click popup shown to the right of a cargo card, alongside the hover
// tooltip. See ARCHITECTURE.md -> CargoCard/CargoPopup.
export const CargoPopup: FC<CargoPopupProps> = ({
  transportOrderNo,
  productName,
  producerName,
  companyFromName,
  companyToName,
}) => {
  if (!transportOrderNo && !productName && !producerName && !companyFromName && !companyToName) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: "100%",
        marginLeft: 8,
        top: 0,
        minWidth: 220,
        maxWidth: 320,
        padding: "8px 12px",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        color: "#fff",
        borderRadius: 6,
        fontSize: 12,
        fontFamily: "system-ui, -apple-system, sans-serif",
        lineHeight: 1.4,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        zIndex: 1000,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        overflow: "hidden",
      }}>
      <Row label="Order" value={transportOrderNo} />
      <Row label="Product" value={productName} />
      <Row label="By" value={producerName} />
      <Row label="From" value={companyFromName} />
      <Row label="To" value={companyToName} />
    </div>
  );
};
