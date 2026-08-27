// Single convention for the "cargo-" prefixed canvas IDs. Canvas items are keyed
// by TransportOrder GUID; the prefix marks them as canvas cargo so they can be
// told apart from raw entity GUIDs in the pallet list and saved-plan flows.
export const CARGO_ID_PREFIX = "cargo-";

export const toCargoId = (id: string): string => (id.startsWith(CARGO_ID_PREFIX) ? id : `${CARGO_ID_PREFIX}${id}`);

export const fromCargoId = (id: string): string =>
  id.startsWith(CARGO_ID_PREFIX) ? id.slice(CARGO_ID_PREFIX.length) : id;
