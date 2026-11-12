/** Exact finite base-10 arithmetic. No Number conversion of contractual values. */
export const DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;

export function isDecimal(value: string): boolean {
  return value.length <= 128 && DECIMAL_PATTERN.test(value) && value !== '-0';
}

interface Decimal {
  coefficient: bigint;
  scale: number;
}

function parse(value: string): Decimal {
  if (!DECIMAL_PATTERN.test(value) || value === '-0')
    throw new RangeError('Expected a canonical decimal string');
  const [whole = '', fraction = ''] = value.split('.');
  return { coefficient: BigInt(whole + fraction), scale: fraction.length };
}

function render(coefficient: bigint, scale: number): string {
  const negative = coefficient < 0n;
  const digits = (negative ? -coefficient : coefficient)
    .toString()
    .padStart(scale + 1, '0');
  const raw =
    scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  const normalized = raw.includes('.')
    ? raw.replace(/0+$/, '').replace(/\.$/, '')
    : raw;
  return negative && coefficient !== 0n ? `-${normalized}` : normalized;
}

export function compareDecimal(a: string, b: string): -1 | 0 | 1 {
  const x = parse(a);
  const y = parse(b);
  const scale = Math.max(x.scale, y.scale);
  const left = x.coefficient * 10n ** BigInt(scale - x.scale);
  const right = y.coefficient * 10n ** BigInt(scale - y.scale);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function shiftDecimal(value: string, power: number): string {
  const d = parse(value);
  const scale = d.scale - power;
  return scale < 0
    ? render(d.coefficient * 10n ** BigInt(-scale), 0)
    : render(d.coefficient, scale);
}

export function roundDecimal(
  value: string,
  places: number,
  mode: 'halfEven' | 'halfUp' | 'truncate',
): string {
  const d = parse(value);
  if (d.scale <= places) return value;
  const divisor = 10n ** BigInt(d.scale - places);
  let quotient = d.coefficient / divisor;
  const remainder = d.coefficient % divisor;
  const absolute = remainder < 0n ? -remainder : remainder;
  if (
    mode !== 'truncate' &&
    (absolute * 2n > divisor ||
      (absolute * 2n === divisor &&
        (mode === 'halfUp' || quotient % 2n !== 0n)))
  ) {
    quotient += d.coefficient < 0n ? -1n : 1n;
  }
  return render(quotient, places);
}

export function boundaryValue(strike: string, offset: -1 | 0 | 1): string {
  const d = parse(strike);
  return render(d.coefficient + BigInt(offset), d.scale);
}
