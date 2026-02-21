export function formatCurrency(value: number): string {
  return value.toLocaleString('vi-VN');
}

export function parseCurrency(str: string): number {
  return parseInt(str.replace(/[,.]/g, ''), 10) || 0;
}

export function formatInputCurrency(value: string): string {
  const num = parseCurrency(value);
  if (!num) return '';
  return formatCurrency(num);
}
