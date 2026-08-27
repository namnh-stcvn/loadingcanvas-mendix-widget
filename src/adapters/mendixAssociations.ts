import { getObjectGuid, isMxObject } from "./mendixRuntime";

const getAssociationGuid = (obj: unknown, associationNames: readonly string[]): string | undefined => {
  if (!isMxObject(obj)) {
    return undefined;
  }

  for (const associationName of associationNames) {
    try {
      const guid = getObjectGuid(obj.get(associationName));
      if (guid) {
        return guid;
      }
    } catch {
      continue;
    }
  }
  return undefined;
};

// Reference attributes are not part of getAttributes(); read them via mxObject.get().
// Handles single-reference GUIDs as well as reference sets (GUID arrays).
export const getReferenceGuids = (obj: unknown, associationNames: readonly string[]): string[] => {
  if (!isMxObject(obj)) {
    return [];
  }

  for (const associationName of associationNames) {
    const guids: string[] = [];
    try {
      const value = obj.get(associationName);
      if (Array.isArray(value)) {
        for (const entry of value) {
          const guid = getObjectGuid(entry);
          if (guid) {
            guids.push(guid);
          }
        }
      } else if (value !== null && value !== undefined && value !== "") {
        const guid = getObjectGuid(value);
        if (guid) {
          guids.push(guid);
        }
      }
    } catch {
      continue;
    }
    if (guids.length > 0) {
      return [...new Set(guids)];
    }
  }
  return [];
};

export const filterByAssociationGuid = (
  objects: unknown[],
  associationNames: readonly string[],
  expectedGuid: string
): unknown[] => objects.filter((obj) => getAssociationGuid(obj, associationNames) === expectedGuid);
