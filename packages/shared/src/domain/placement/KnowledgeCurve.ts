import { PlacementConfig } from './PlacementConfig'

export type CurvePoint = { band: number; value: number; weight: number }

type Block = { sum: number; weight: number; bands: number[] }

/** Monotone non-increasing knowledge curve over bands (pool-adjacent-violators), linear between probed bands. */
export class KnowledgeCurve {
  private constructor(private readonly fitted: CurvePoint[]) {}

  static fit(points: CurvePoint[]): KnowledgeCurve {
    const sorted = points.filter(p => p.weight > 0).sort((a, b) => a.band - b.band)
    const blocks: Block[] = []
    for (const p of sorted) {
      blocks.push(KnowledgeCurve.pool(blocks, { sum: p.value * p.weight, weight: p.weight, bands: [p.band] }))
    }
    return new KnowledgeCurve(KnowledgeCurve.flatten(blocks))
  }

  private static pool(blocks: Block[], incoming: Block): Block {
    let merged = incoming
    while (blocks.length > 0 && KnowledgeCurve.mean(blocks[blocks.length - 1]) < KnowledgeCurve.mean(merged)) {
      const prev = blocks.pop() as Block
      merged = { sum: prev.sum + merged.sum, weight: prev.weight + merged.weight, bands: [...prev.bands, ...merged.bands] }
    }
    return merged
  }

  private static mean(b: Block): number {
    return b.sum / b.weight
  }

  private static flatten(blocks: Block[]): CurvePoint[] {
    return blocks.flatMap(b => b.bands.map(band => ({ band, value: KnowledgeCurve.mean(b), weight: b.weight })))
  }

  get isEmpty(): boolean {
    return this.fitted.length === 0
  }

  valueAt(band: number): number {
    if (this.isEmpty) return 0
    const first = this.fitted[0]
    const last = this.fitted[this.fitted.length - 1]
    if (band <= first.band) return first.value
    if (band >= last.band) return last.value
    return this.between(band)
  }

  expectedKnown(sizes: Map<number, number>): number {
    let total = 0
    for (const [band, size] of sizes) total += this.valueAt(band) * size
    return total
  }

  confidentBand(bands: number[]): number {
    const sure = bands.filter(b => this.valueAt(b) >= PlacementConfig.CONFIDENT_KNOWN)
    return sure.length === 0 ? 0 : Math.max(...sure)
  }

  private between(band: number): number {
    const upper = this.fitted.findIndex(p => p.band >= band)
    const hi = this.fitted[upper]
    const lo = this.fitted[upper - 1]
    return lo.value + ((hi.value - lo.value) * (band - lo.band)) / (hi.band - lo.band)
  }
}
