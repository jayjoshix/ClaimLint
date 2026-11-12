/**
 * Small checker oracle, deliberately independent of decimal.ts. It compares
 * digit strings lexically and rounds by inspecting discarded digits and
 * carrying in base ten. It never calls the resolver's arithmetic helpers.
 */
function parts(value: string): {
  negative: boolean;
  whole: string;
  fraction: string;
} {
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/.test(value) || value === '-0')
    throw new RangeError('Reference oracle requires a canonical decimal');
  const negative = value.startsWith('-');
  const [whole = '', fraction = ''] = (negative ? value.slice(1) : value).split(
    '.',
  );
  return { negative, whole, fraction };
}

function render(negative: boolean, whole: string, fraction: string): string {
  whole = whole.replace(/^0+(?=\d)/, '') || '0';
  fraction = fraction.replace(/0+$/, '');
  return `${negative && (whole !== '0' || fraction !== '') ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

export function referenceCompare(left: string, right: string): -1 | 0 | 1 {
  const a = parts(left);
  const b = parts(right);
  if (a.negative !== b.negative) return a.negative ? -1 : 1;
  const width = Math.max(a.fraction.length, b.fraction.length);
  const aDigits = a.whole + a.fraction.padEnd(width, '0');
  const bDigits = b.whole + b.fraction.padEnd(width, '0');
  const unsigned =
    a.whole.length !== b.whole.length
      ? a.whole.length < b.whole.length
        ? -1
        : 1
      : aDigits === bDigits
        ? 0
        : aDigits < bDigits
          ? -1
          : 1;
  return a.negative ? (unsigned === 0 ? 0 : unsigned === 1 ? -1 : 1) : unsigned;
}

export function referenceShift(value: string, power: number): string {
  const p = parts(value);
  const digits = p.whole + p.fraction;
  const point = p.whole.length + power;
  if (point <= 0) return render(p.negative, '0', '0'.repeat(-point) + digits);
  if (point >= digits.length)
    return render(p.negative, digits + '0'.repeat(point - digits.length), '');
  return render(p.negative, digits.slice(0, point), digits.slice(point));
}

export function referenceRound(
  value: string,
  places: number,
  mode: 'halfEven' | 'halfUp' | 'truncate',
): string {
  const p = parts(value);
  if (p.fraction.length <= places) return value;
  const kept = p.fraction.slice(0, places);
  const discarded = p.fraction.slice(places);
  const first = discarded[0]!;
  const tie = first === '5' && /^0*$/.test(discarded.slice(1));
  const last = (kept || p.whole).at(-1)!;
  const increment =
    mode !== 'truncate' &&
    (first > '5' ||
      (first === '5' && !tie) ||
      (tie && (mode === 'halfUp' || '13579'.includes(last))));
  let digits = p.whole + kept;
  if (increment) {
    const characters = [...digits];
    let index = characters.length - 1;
    while (index >= 0 && characters[index] === '9') {
      characters[index] = '0';
      index--;
    }
    if (index < 0) characters.unshift('1');
    else
      characters[index] = '0123456789'[
        '0123456789'.indexOf(characters[index]!) + 1
      ]!;
    digits = characters.join('');
  }
  return places === 0
    ? render(p.negative, digits, '')
    : render(p.negative, digits.slice(0, -places), digits.slice(-places));
}
