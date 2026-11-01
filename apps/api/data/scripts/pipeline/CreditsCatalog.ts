import type { ExtensionSourceInfo } from './CandidateReader'
import { ListId, PipelineLimits } from './PipelineConfig'

export type Credit = { name: string; license: string; url: string; note?: string }
export type ListInfo = { id: ListId; name: string; source: string; license: string }

/** Attribution entries and list metadata published with the content. */
export class CreditsCatalog {
  static readonly NGSL_LICENSE = 'CC BY-SA 4.0'
  static readonly NGSL_SOURCE = 'https://www.newgeneralservicelist.com/'
  static readonly NO_URL = '#'
  static readonly EXTENDED_NAME = 'Extended vocabulary'

  static lists(extension?: ExtensionSourceInfo): ListInfo[] {
    const { NGSL_LICENSE: license, NGSL_SOURCE: source } = CreditsCatalog
    const core = [
      { id: ListId.Ngsl, name: 'NGSL 1.2', source, license },
      { id: ListId.NgslSpoken, name: 'NGSL-Spoken 1.2', source, license },
    ]
    return extension ? [...core, CreditsCatalog.extendedList(extension)] : core
  }

  static extendedList(extension: ExtensionSourceInfo): ListInfo {
    return { id: ListId.Extended, name: CreditsCatalog.EXTENDED_NAME, source: extension.url, license: extension.license }
  }

  static extensionCredit(extension: ExtensionSourceInfo): Credit {
    const note = `${extension.attribution}. Frequency order of the words ranked ${PipelineLimits.CoreWordCount + 1} to ${PipelineLimits.ExpectedWordCount}; the word file remains ${extension.license}.`
    return { name: extension.name, license: extension.license, url: extension.url, note }
  }

  static readonly WIKTIONARY_NAME = 'Wiktionary via dictionaryapi.dev and kaikki.org'
  static readonly VIETNAMESE_NAME = 'Vietnamese meanings'

  static vietnameseCredit(): Credit {
    return {
      name: CreditsCatalog.VIETNAMESE_NAME, license: 'CC BY-SA 3.0', url: 'https://kaikki.org/dictionary/English/',
      note: 'Vietnamese translations from Wiktionary (kaikki.org extracts); gaps filled with short meanings written for WordMap.',
    }
  }

  static credits(extension?: ExtensionSourceInfo): Credit[] {
    const { NGSL_LICENSE: license, NGSL_SOURCE: url } = CreditsCatalog
    return [
      ...(extension ? [CreditsCatalog.extensionCredit(extension)] : []),
      { name: 'NGSL 1.2 and NGSL-Spoken 1.2', license, url, note: 'Browne, Culligan and Phillips. Word ranks, spoken tag and inflected forms. Modified word file remains CC BY-SA 4.0.' },
      { name: CreditsCatalog.WIKTIONARY_NAME, license: 'CC BY-SA 3.0', url: 'https://dictionaryapi.dev/', note: 'Definitions, parts of speech and IPA (kaikki.org Wiktionary extracts as fallback).' },
      CreditsCatalog.vietnameseCredit(),
      { name: 'Tatoeba', license: 'CC BY 2.0 FR', url: 'https://tatoeba.org/', note: 'Example sentences; each carries its Tatoeba sentence id (tatoeba.org/sentences/show/ID).' },
      { name: 'Custom entries', license, url: CreditsCatalog.NO_URL, note: 'Original definitions and sentences written for WordMap to fill gaps.' },
      { name: 'Inter, IBM Plex Mono, Source Serif 4', license: 'SIL OFL 1.1', url: 'https://fontsource.org/', note: 'Typefaces.' },
      { name: 'Web Speech API', license: 'Browser built-in', url: 'https://developer.mozilla.org/docs/Web/API/Web_Speech_API', note: 'Pronunciation audio; no audio data shipped.' },
    ]
  }
}
