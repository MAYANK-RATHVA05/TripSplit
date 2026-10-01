/** Preview only: use integer minor units so displayed shares add up exactly. */
export function equalSplit(amount: string, people: string, decimals: number) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 3) return null;
  const pattern =
    decimals === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`);
  if (!pattern.test(amount) || !/^\d+$/.test(people)) return null;
  const count = Number(people);
  const [whole, fraction = ""] = amount.split(".");
  const minor =
    Number(whole) * 10 ** decimals + Number(fraction.padEnd(decimals, "0"));
  if (!Number.isSafeInteger(minor) || minor < 0 || count < 1 || count > 100)
    return null;
  return {
    share: Math.floor(minor / count),
    remainder: minor % count,
    count,
    minor,
  };
}
