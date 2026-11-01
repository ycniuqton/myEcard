import { PipelineLimits, Pos } from './PipelineConfig'

/** Contraction fragments and dialect spellings that NGSL lists but that never appear as whole tokens. */
export class FormNoise {
  static readonly Stubs = new Set([
    'isn', 'aren', 'ain', 'wasn', 'weren', 'hasn', 'haven', 'hadn', 'doesn', 'didn', 'don', 'wouldn', 'couldn',
    'shouldn', 'mustn', 'needn', 'll', 've', 're', 'im', 'em', 'ye', 'bein', 'doin', 'goin', 'gettin', 'hafta',
    'gonna', 'gotta', 'wanna',
  ])
  static readonly StubsByLemma: Record<string, string[]> = { will: ['won'] }

  static isNoise(lemma: string, form: string): boolean {
    return FormNoise.Stubs.has(form) || (FormNoise.StubsByLemma[lemma] ?? []).includes(form)
  }
}

/** Letter groups appended or replaced when inflecting a lemma. */
export class FormSuffix {
  static readonly E = 'e'
  static readonly EE = 'ee'
  static readonly O = 'o'
  static readonly D = 'd'
  static readonly S = 's'
  static readonly R = 'r'
  static readonly ST = 'st'
  static readonly ES = 'es'
  static readonly ED = 'ed'
  static readonly ER = 'er'
  static readonly EST = 'est'
  static readonly IES = 'ies'
  static readonly IED = 'ied'
  static readonly IER = 'ier'
  static readonly IEST = 'iest'
  static readonly ING = 'ing'
}

/** Produces inflected forms used to highlight a word inside example sentences. */
export class FormsGenerator {
  static readonly VOWELS = 'aeiou'
  static readonly SIBILANT_END = /(s|sh|ch|x|z)$/
  static readonly CONSONANT_Y = /[^aeiou]y$/
  static readonly SHORT_CVC = /^[^aeiou]*[aeiou][^aeiouwxy]$/
  static readonly MAX_DOUBLING_LENGTH = 4

  generate(lemma: string, pos: string[], listed: string[] | undefined): string[] {
    const forms = new Set<string>((listed ?? []).map(form => form.toLowerCase()))
    forms.delete(lemma)
    if (listed === undefined) this.generated(lemma, pos).forEach(form => forms.add(form))
    return [...forms].filter(form => form.length >= PipelineLimits.MinFormLength && !FormNoise.isNoise(lemma, form))
  }

  generated(lemma: string, pos: string[]): string[] {
    const kinds = pos.length > 0 ? pos : [Pos.Noun, Pos.Verb]
    const out: string[] = []
    if (kinds.includes(Pos.Verb)) out.push(...this.verbForms(lemma))
    if (kinds.includes(Pos.Noun)) out.push(...this.pluralForms(lemma))
    if (kinds.includes(Pos.Adjective)) out.push(...this.adjectiveForms(lemma))
    return out
  }

  verbForms(lemma: string): string[] {
    const sx = FormSuffix
    const stem = this.stemFor(lemma)
    const clipped = lemma.slice(0, -1)
    const past = lemma.endsWith(sx.E) ? `${lemma}${sx.D}` : FormsGenerator.CONSONANT_Y.test(lemma) ? `${clipped}${sx.IED}` : `${stem}${sx.ED}`
    const ing = lemma.endsWith(sx.E) && !lemma.endsWith(sx.EE) ? `${clipped}${sx.ING}` : `${stem}${sx.ING}`
    return [...this.pluralForms(lemma), past, ing]
  }

  pluralForms(lemma: string): string[] {
    const sx = FormSuffix
    if (FormsGenerator.CONSONANT_Y.test(lemma)) return [`${lemma.slice(0, -1)}${sx.IES}`]
    if (FormsGenerator.SIBILANT_END.test(lemma) || lemma.endsWith(sx.O)) return [`${lemma}${sx.ES}`]
    return [`${lemma}${sx.S}`]
  }

  adjectiveForms(lemma: string): string[] {
    const sx = FormSuffix
    const clipped = lemma.slice(0, -1)
    if (lemma.endsWith(sx.E)) return [`${lemma}${sx.R}`, `${lemma}${sx.ST}`]
    if (FormsGenerator.CONSONANT_Y.test(lemma)) return [`${clipped}${sx.IER}`, `${clipped}${sx.IEST}`]
    const stem = this.stemFor(lemma)
    return [`${stem}${sx.ER}`, `${stem}${sx.EST}`]
  }

  private stemFor(lemma: string): string {
    const doubles = lemma.length <= FormsGenerator.MAX_DOUBLING_LENGTH && FormsGenerator.SHORT_CVC.test(lemma) && !FormsGenerator.VOWELS.includes(lemma.slice(-1))
    return doubles ? lemma + lemma.slice(-1) : lemma
  }
}
