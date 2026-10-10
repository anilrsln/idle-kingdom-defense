const SUFFIXES = [
  { value: 1e18, suffix: 'Qi' }, { value: 1e15, suffix: 'Qa' },
  { value: 1e12, suffix: 'T' },  { value: 1e9,  suffix: 'B' },
  { value: 1e6,  suffix: 'M' },  { value: 1e3,  suffix: 'K' },
];

export function formatNumber(num, decimals = 2) {
  if (num < 1000) return Math.floor(num).toString();
  for (const { value, suffix } of SUFFIXES) {
    if (num >= value) return (num / value).toFixed(decimals) + suffix;
  }
  return num.toString();
}

export function formatNumberFull(num) {
  return Math.floor(num).toLocaleString('tr-TR');
}
