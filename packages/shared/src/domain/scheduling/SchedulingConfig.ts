/** SM-2 tunables from the product spec. */
export class SchedulingConfig {
  static readonly START_EASE = 2.5
  static readonly MIN_EASE = 1.3
  static readonly KNOWN_AT = 21
  static readonly MASTERED_AT = 90
  static readonly ASSUMED_CHECK_DAYS = 30
  static readonly ASSUMED_REPS = 2
  static readonly FUZZ_MIN_INTERVAL = 4
  static readonly FUZZ_SPREAD = 0.1
  static readonly FUZZ_BASE = 0.95
  static readonly EASE_PRECISION = 100
  static readonly AGAIN_EASE = -0.2
  static readonly HARD_EASE = -0.15
  static readonly EASY_EASE = 0.15
  static readonly HARD_FACTOR = 1.2
  static readonly EASY_FACTOR = 1.3
  static readonly FIRST_INTERVAL = 1
  static readonly SECOND_INTERVAL = 3
  static readonly MIN_INTERVAL = 1
}
