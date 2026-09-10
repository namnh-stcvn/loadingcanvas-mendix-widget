// Single convention for the "cargo-" prefixed canvas IDs. Canvas items are keyed
// by TransportOrder GUID; the prefix marks them as canvas cargo so they can be
// told apart from raw entity GUIDs in the pallet list and saved-plan flows.
// Instance suffix (-0, -1, etc.) is used for multiple items from same transport order.
export const CARGO_ID_PREFIX = "cargo-";

export const toCargoId = (id: string): string => (id.startsWith(CARGO_ID_PREFIX) ? id : `${CARGO_ID_PREFIX}${id}`);

// Extracts base TransportOrder GUID from a cargo ID, stripping any instance suffix (-0, -1, etc.)
export const fromCargoId = (id: string): string => {
  if (!id.startsWith(CARGO_ID_PREFIX)) {
    return id;
  }
  const withoutPrefix = id.slice(CARGO_ID_PREFIX.length);
  // Remove instance suffix like "-0", "-1", etc.
  const dashIndex = withoutPrefix.lastIndexOf("-");
  if (dashIndex > 0 && /^\d+$/.test(withoutPrefix.slice(dashIndex + 1))) {
    return withoutPrefix.slice(0, dashIndex);
  }
  return withoutPrefix;
};

// Get the instance index from a cargo ID (0, 1, 2...), or 0 if not present
export const getCargoInstanceIndex = (id: string): number => {
  if (!id.startsWith(CARGO_ID_PREFIX)) {
    return 0;
  }
  const withoutPrefix = id.slice(CARGO_ID_PREFIX.length);
  const dashIndex = withoutPrefix.lastIndexOf("-");
  if (dashIndex > 0 && /^\d+$/.test(withoutPrefix.slice(dashIndex + 1))) {
    return parseInt(withoutPrefix.slice(dashIndex + 1), 10);
  }
  return 0;
};
