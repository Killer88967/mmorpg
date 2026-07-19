export function invHas(inv: any, item: string, count: number) {
  return (inv[item] ?? 0) >= count;
}
export function invAdd(inv: any, item: string, count: number) {
  inv[item] = (inv[item] ?? 0) + count;
}
export function invSub(inv: any, item: string, count: number) {
  const left = (inv[item] ?? 0) - count;
  if (left > 0) inv[item] = left;
  else delete inv[item];
}
export function normItem(o: any) {
  if (!o) return null;
  const item = String(o.item ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  const count = Math.floor(Number(o.count));
  if (!item || !Number.isFinite(count) || count < 1 || count > 100000)
    return null;
  return { item, count };
}
