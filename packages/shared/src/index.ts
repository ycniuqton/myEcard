/**
 * @wordmap/shared public API (stable names).
 * enums: Status, Grade, KnowAnswer, ReviewMode, Theme, Voice, ListId, ExampleSource, Cefr, SchedulerKind, ErrorCode.
 * dto: Word, WordList, UserWord, ReviewLog, Settings, DayStat, Credit, ProbeResult, PlacementSubmission, SyncPayload, StatsResponse, all request/response types.
 * scheduling: schedule(card, grade, now, rng?) facade, SchedulerManager, Sm2Strategy, CardFactory, newCard, learningCard, assumedKnownCard.
 * placement: AdaptivePlacementEngine (+ .shared), PlacementConfig, StopReason, PseudowordBank, assumedDue, AssumedSchedule; PlacementEngine (groupByBand, nextNewWords), bandOf.
 * stats: StatsCalculator (+ StatsCalculator.shared.compute), StreakCalculator, streaks, statusCounts, percentKnown, dueCounts, knownOverTime, reviewsPerDay.
 * session: SessionPlanner.plan(input), learnMore(input, batch), dueIds, DUE_CAP.
 * dates: DateUtil, DateConstants, isoDate, addDays, daysBetween.
 */
export * from './enums'
export * from './dto'
export * from './domain/dates'
export * from './domain/scheduling'
export * from './domain/placement'
export * from './domain/stats'
export * from './domain/session'
export * from './testing/SyntheticWords'
export * from './domain/settings/SettingsLimits'
