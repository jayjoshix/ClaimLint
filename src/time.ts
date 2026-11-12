import { Temporal } from '@js-temporal/polyfill';

/** Inputs require an explicit offset; the model never consults a system clock. */
export function instant(value: string): string {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value))
    throw new RangeError('Explicit UTC offset required');
  return Temporal.Instant.from(value).toString();
}

export function compareTime(a: string, b: string): number {
  return Temporal.Instant.compare(a, b);
}

export function addSeconds(value: string, seconds: number): string {
  return Temporal.Instant.from(value).add({ seconds }).toString();
}
