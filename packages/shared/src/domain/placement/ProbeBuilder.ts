import type { Rng } from '../scheduling/SchedulingStrategy'
import { PlacementConfig } from './PlacementConfig'
import { PseudowordBank } from './PseudowordBank'
import type { PlacementWord, Probe, ProbeItem } from './PlacementTypes'

/** Builds one shuffled probe: real words of a band plus a not-yet-used pseudoword. */
export class ProbeBuilder {
  build(band: number, bandWords: PlacementWord[], usedPseudo: string[], rng: Rng): Probe {
    const real = this.sample(bandWords, PlacementConfig.REAL_PER_PROBE, rng).map(w => this.realItem(w))
    const pseudo = this.pickPseudo(usedPseudo, rng).map(text => this.pseudoItem(text))
    const all = [...real, ...pseudo]
    return { band, items: this.sample(all, all.length, rng) }
  }

  private sample<T>(source: T[], n: number, rng: Rng): T[] {
    const pool = source.slice()
    const count = Math.min(n, pool.length)
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(rng() * (pool.length - i))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool.slice(0, count)
  }

  private pickPseudo(used: string[], rng: Rng): string[] {
    const fresh = PseudowordBank.all().filter(p => !used.includes(p))
    const pool = fresh.length > 0 ? fresh : PseudowordBank.all().slice()
    return this.sample(pool, PlacementConfig.PSEUDO_PER_PROBE, rng)
  }

  private realItem(w: PlacementWord): ProbeItem {
    return { key: w.id, text: w.lemma, wordId: w.id, pseudo: false }
  }

  private pseudoItem(text: string): ProbeItem {
    return { key: `${PlacementConfig.PSEUDO_KEY_PREFIX}${text}`, text, wordId: null, pseudo: true }
  }
}
