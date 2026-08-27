import { getMx } from "./mendixRuntime";

export const loadMendixObject = async (guid: string): Promise<unknown> => {
  const mxData = getMx();
  if (mxData) {
    return new Promise((resolve, reject) => {
      if (!guid) {
        resolve(null);
        return;
      }
      mxData.get({
        guid,
        callback: (obj: unknown) => resolve(obj),
        error: (err: Error) => reject(err),
      });
    });
  }
  // Dev fallback: assume the guid is actually a JSON string or mock
  try {
    return JSON.parse(guid);
  } catch {
    return { id: guid, guid };
  }
};

export const loadMendixObjects = async (guids: string[]): Promise<unknown[]> => {
  if (!guids || guids.length === 0) {
    return [];
  }
  const mxData = getMx();
  if (mxData) {
    return new Promise((resolve, reject) => {
      mxData.get({
        guids,
        callback: (objs: unknown) => {
          const list = Array.isArray(objs) ? objs : objs ? [objs] : [];
          resolve(list);
        },
        error: (err: Error) => reject(err),
      });
    });
  }
  // Dev fallback
  return guids
    .map((g) => {
      try {
        return JSON.parse(g);
      } catch {
        return { id: g, guid: g };
      }
    })
    .filter(Boolean);
};

export const loadMendixList = async (xpath: string): Promise<unknown[]> => {
  const mxData = getMx();
  if (mxData) {
    return new Promise((resolve, reject) => {
      mxData.get({
        xpath,
        callback: (items: unknown) => {
          const list = Array.isArray(items) ? items : items ? [items] : [];
          resolve(list);
        },
        error: (err: Error) => reject(err),
      });
    });
  }
  // Dev fallback: assume xpath is actually a JSON string
  try {
    const parsed = JSON.parse(xpath);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const executeMendixAction = async (actionId: string, params: Record<string, unknown> = {}): Promise<unknown> => {
  const mxData = getMx();
  if (mxData) {
    return new Promise((resolve, reject) => {
      mxData.action({
        params: { actionId, ...params },
        callback: (result: unknown) => resolve(result),
        error: (err: Error) => reject(err),
      });
    });
  }
  return null;
};
