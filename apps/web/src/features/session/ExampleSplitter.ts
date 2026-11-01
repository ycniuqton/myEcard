export interface ExampleParts {
  before: string
  match: string
  after: string
}

/** Splits an example sentence around the first occurrence of the word or one of its forms. */
export class ExampleSplitter {
  private static readonly ESCAPE = /[.*+?^${}()|[\]\\]/g
  private static readonly ESCAPED = '\\$&'
  private static readonly BEFORE_BOUNDARY = '(^|[^\\p{L}])'
  private static readonly AFTER_BOUNDARY = '(?![\\p{L}])'

  static split(text: string, lemma: string, forms: readonly string[] = []): ExampleParts {
    const candidates = [lemma, ...forms].filter(Boolean).sort((a, b) => b.length - a.length)
    const alternatives = candidates.map(c => c.replace(ExampleSplitter.ESCAPE, ExampleSplitter.ESCAPED)).join('|')
    const hit = alternatives ? ExampleSplitter.find(text, alternatives) : null
    if (!hit) return { before: text, match: '', after: '' }
    const start = hit.index + hit[1].length
    return { before: text.slice(0, start), match: hit[2], after: text.slice(start + hit[2].length) }
  }

  static hasMatch(parts: ExampleParts): boolean {
    return parts.match.length > 0
  }

  private static find(text: string, alternatives: string): RegExpExecArray | null {
    return new RegExp(`${ExampleSplitter.BEFORE_BOUNDARY}(${alternatives})${ExampleSplitter.AFTER_BOUNDARY}`, 'iu').exec(text)
  }
}
