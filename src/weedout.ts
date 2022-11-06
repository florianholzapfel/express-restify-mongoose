export function weedout(obj: Record<string, unknown>, path: string) {
  const keys = path.split(".");

  for (let i = 0, length = keys.length; i < length; i++) {
    if (Array.isArray(obj)) {
      for (let j = 0; j < obj.length; j++) {
        weedout(obj[j], keys.slice(1).join("."));
      }
    } else if (!obj || typeof obj[keys[i]] === "undefined") {
      return;
    }

    if (i < keys.length - 1) {
      obj = obj[keys[i]];
    } else {
      delete obj[keys[i]];
    }
  }

  return obj;
}
