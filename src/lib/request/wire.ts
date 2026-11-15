/**
 * How screen data crosses the network. Page data holds real `Date`s, which
 * `JSON.stringify` would flatten to strings, so dates are tagged on the way
 * out and turned back into `Date`s on the way in (the screens were written to
 * receive Dates, as they did when everything ran in one process).
 */
const TAG = "__date";

export function encodeWire(data: unknown): string {
  return JSON.stringify(data, function (this: Record<string, unknown>, key: string, value: unknown) {
    // JSON.stringify calls Date#toJSON before the replacer sees the value, so look at the original.
    const original = this[key];
    return original instanceof Date ? { [TAG]: original.toISOString() } : value;
  });
}

export function decodeWire<T>(text: string): T {
  return JSON.parse(text, (_key, value) =>
    value && typeof value === "object" && typeof (value as Record<string, unknown>)[TAG] === "string"
      ? new Date((value as Record<string, string>)[TAG])
      : value,
  ) as T;
}
