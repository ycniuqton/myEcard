/** Verified non-words (absent from NGSL and the Tatoeba vocabulary) used as false-alarm probes. */
export class PseudowordBank {
  static readonly WORDS: readonly string[] = [
    'blorent', 'dranthe', 'glimmet', 'quorbit', 'brundle', 'dolsip', 'ferlin', 'gartle', 'jarnet',
    'kelpid', 'nobril', 'orplex', 'pelkin', 'rastim', 'tarnop', 'ulmish', 'vandrel', 'wexlin', 'yarnet',
    'zolder', 'bramel', 'crelin', 'drossle', 'fendar', 'glorbit', 'hapsel', 'jorvan', 'kestrim',
    'lupret', 'mondrel', 'narvet', 'oblick', 'pranel', 'quissel', 'rondik', 'sartle', 'tolvin',
    'umbrek', 'wimbrel', 'yolkin', 'zerpin', 'blendow', 'clarvin', 'dorket', 'fropel', 'korpen',
    'lanvet', 'mirkle', 'ospren', 'plamet', 'rilven', 'stobrin', 'tavlen', 'urgel', 'vinkle', 'wopsin',
    'yantel', 'zimber', 'breskin', 'kolmet', 'lorpin', 'nopsel', 'quarnet', 'uldrin', 'velbat',
    'wornik', 'yelbin', 'zantro', 'clundel', 'dimprel', 'eskrin', 'flenter', 'gostrel', 'hultin',
    'imbrel', 'lindrop', 'morvel', 'nastril', 'olbrin', 'pendral',
  ]

  static all(): readonly string[] {
    return PseudowordBank.WORDS
  }

  static contains(text: string): boolean {
    return PseudowordBank.WORDS.includes(text)
  }
}
