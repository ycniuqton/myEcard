/** Number and rank-range formatting shared by the map, band and word screens. */
export class NumberFormat {
  private static readonly LOCALE = 'en-US'
  private static readonly RANGE_DASH = '–'

  private static readonly formatter = new Intl.NumberFormat(NumberFormat.LOCALE)

  static int(n: number): string {
    return NumberFormat.formatter.format(n)
  }

  static range(start: number, end: number): string {
    return [NumberFormat.int(start), NumberFormat.int(end)].join(NumberFormat.RANGE_DASH)
  }
}
