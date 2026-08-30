import type { TransformFnParams } from "class-transformer";

/**
 * Parse an optional boolean from a query string.
 *
 * Do not use `Boolean(value)` or implicit conversion: `Boolean("false")`
 * is `true`, which is why Nest's `enableImplicitConversion` cannot be
 * trusted for query flags.
 */
export function toOptionalBoolean(value: unknown): boolean | undefined {
  const raw = Array.isArray(value) ? value[value.length - 1] : value;
  if (raw === true || raw === "true" || raw === "1" || raw === 1) {
    return true;
  }
  if (raw === false || raw === "false" || raw === "0" || raw === 0) {
    return false;
  }
  return undefined;
}

/**
 * class-transformer `@Transform` that reads the original query value.
 *
 * `enableImplicitConversion` converts `"false"` → `true` before `@Transform`
 * sees `value`. The source object still has the raw string.
 */
export function transformQueryBoolean({
  value,
  obj,
  key,
}: TransformFnParams): boolean | undefined {
  return toOptionalBoolean(obj?.[key] ?? value);
}
