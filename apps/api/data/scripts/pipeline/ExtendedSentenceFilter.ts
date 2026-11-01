import { SentenceFilter } from './SentenceFilter'

/** Sentence rules for extension examples: the core rules plus explicit sexual and drug vocabulary. */
export class ExtendedSentenceFilter extends SentenceFilter {
  static readonly EXTRA_BLOCKED = new Set([
    'ejaculate', 'ejaculates', 'ejaculating', 'ejaculation', 'sex', 'sexual', 'sexually', 'sexy', 'erection', 'genital', 'genitals',
    'testicle', 'testicles', 'semen', 'sperm', 'intercourse', 'prostitute', 'prostitutes', 'prostitution', 'pedophile', 'pedophilia',
    'molest', 'molested', 'molestation', 'boob', 'boobs', 'breast', 'breasts', 'nipple', 'nipples', 'condom', 'condoms', 'vibrator',
    'lust', 'horny', 'fetish', 'hooker', 'slave', 'slaves', 'cocaine', 'heroin', 'bomb', 'bombs', 'kill', 'killed', 'killing',
    'killer', 'dead', 'corpse', 'torture', 'tortured', 'gun', 'guns', 'shot', 'shoot', 'weapon', 'weapons', 'bastards', 'sluts',
    'cunt', 'dildo', 'masturbation', 'porno', 'incest', 'nude', 'rapist', 'virgin', 'pregnant', 'abortion',
  ])

  isEligible(text: string): boolean {
    return super.isEligible(text) && !this.tokenize(text).some(token => ExtendedSentenceFilter.EXTRA_BLOCKED.has(token))
  }
}
