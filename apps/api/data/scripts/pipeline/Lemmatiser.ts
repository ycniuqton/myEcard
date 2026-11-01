/** Strips regular inflection endings to propose the lemmas a token could come from. */
export class Lemmatiser {
  static readonly MIN_BASE_LENGTH = 3
  static readonly IES = 'ies'
  static readonly IED = 'ied'
  static readonly ES = 'es'
  static readonly ED = 'ed'
  static readonly ING = 'ing'
  static readonly S = 's'
  static readonly SS = 'ss'
  static readonly Y = 'y'
  static readonly E = 'e'
  static readonly NONE = ''
  static readonly SIBILANT_BEFORE_ES = /(s|sh|ch|x|z|o)es$/
  static readonly DOUBLED_END = /([^aeiou])\1$/

  basesOf(token: string): string[] {
    const found: string[] = []
    if (token.endsWith(Lemmatiser.IES)) found.push(this.swap(token, Lemmatiser.IES, Lemmatiser.Y))
    if (token.endsWith(Lemmatiser.IED)) found.push(this.swap(token, Lemmatiser.IED, Lemmatiser.Y))
    if (Lemmatiser.SIBILANT_BEFORE_ES.test(token)) found.push(this.swap(token, Lemmatiser.ES, Lemmatiser.NONE))
    if (token.endsWith(Lemmatiser.S) && !token.endsWith(Lemmatiser.SS)) found.push(this.swap(token, Lemmatiser.S, Lemmatiser.NONE))
    found.push(...this.verbBases(token, Lemmatiser.ED), ...this.verbBases(token, Lemmatiser.ING))
    return [...new Set(found)].filter(base => base.length >= Lemmatiser.MIN_BASE_LENGTH && base !== token)
  }

  private verbBases(token: string, suffix: string): string[] {
    if (!token.endsWith(suffix)) return []
    const stem = this.swap(token, suffix, Lemmatiser.NONE)
    const undoubled = Lemmatiser.DOUBLED_END.test(stem) ? [stem.slice(0, -1)] : []
    return [stem, `${stem}${Lemmatiser.E}`, ...undoubled]
  }

  private swap(token: string, suffix: string, replacement: string): string {
    return token.slice(0, token.length - suffix.length) + replacement
  }
}
