/** Pronunciation display formatting: wraps bare IPA in slashes. */
export class IpaFormat {
  static readonly DELIMITER = '/'

  static display(ipa: string | null | undefined): string {
    const bare = (ipa ?? '').split(IpaFormat.DELIMITER).join('').trim()
    if (!bare) return ''
    return `${IpaFormat.DELIMITER}${bare}${IpaFormat.DELIMITER}`
  }
}
