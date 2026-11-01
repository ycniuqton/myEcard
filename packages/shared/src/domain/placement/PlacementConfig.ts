/** Tunable numbers of the adaptive placement test. */
export class PlacementConfig {
  static readonly BAND_SIZE = 100
  static readonly START_BAND = 20
  static readonly FIRST_BAND = 1
  static readonly REAL_PER_PROBE = 6
  static readonly PSEUDO_PER_PROBE = 1
  static readonly MAX_PROBES = 10
  static readonly MIN_PROBES_TO_FINISH = 3
  static readonly BISECT_THRESHOLD = 0.9
  static readonly CONFIDENT_KNOWN = 0.9
  static readonly REFINE_PROBES = 2
  static readonly REFINE_STEP = 2
  static readonly MIN_PSEUDO_FOR_RATE = 2
  static readonly MAX_FALSE_ALARM_RATE = 0.8
  static readonly ASSUMED_MARGIN = 100
  static readonly SLIDER_STEP = 50
  static readonly PERCENT = 100
  static readonly PSEUDO_KEY_PREFIX = 'pseudo:'
  static readonly NO_PROBE_MESSAGE = 'Placement search is finished; no further probe available'
}

/** Why an adaptive placement search stopped. */
export enum StopReason {
  Boundary = 'boundary',
  Refined = 'refined',
  Exhausted = 'exhausted',
  MaxProbes = 'max_probes',
}
