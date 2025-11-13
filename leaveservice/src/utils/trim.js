export function trimStringsDeep(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(trimStringsDeep);
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) {
      out[k] = trimStringsDeep(value[k]);
    }
    return out;
  }
  return value;
}
