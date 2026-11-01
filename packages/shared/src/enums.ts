/** Learning state of a word. */
export enum Status {
  Unknown = 'unknown',
  Learning = 'learning',
  Known = 'known',
  Mastered = 'mastered',
}

/** Self-assessed recall quality on a review card. */
export enum Grade {
  Again = 'again',
  Hard = 'hard',
  Good = 'good',
  Easy = 'easy',
}

/** Answers given outside of graded reviews (placement test, word card). */
export enum KnowAnswer {
  Know = 'know',
  DontKnow = 'dont_know',
}

/** Where a review log entry came from. */
export enum ReviewMode {
  Flashcard = 'flashcard',
  Placement = 'placement',
  Cloze = 'cloze',
}

/** App colour theme preference. */
export enum Theme {
  System = 'system',
  Light = 'light',
  Dark = 'dark',
}

/** Pronunciation accent. */
export enum Voice {
  Us = 'us',
  Uk = 'uk',
}

/** Built-in word list identifiers. */
export enum ListId {
  Ngsl = 'ngsl',
  NgslSpoken = 'ngsl-spoken',
}

/** Origin of an example sentence. */
export enum ExampleSource {
  Tatoeba = 'tatoeba',
  Wiktionary = 'wiktionary',
  Custom = 'custom',
}

/** CEFR proficiency level. */
export enum Cefr {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

/** Scheduling algorithm selector. */
export enum SchedulerKind {
  Sm2 = 'sm2',
}

/** Standard API error codes. */
export enum ErrorCode {
  Validation = 'validation_error',
  NotFound = 'not_found',
  Conflict = 'conflict',
  Internal = 'internal_error',
  Unauthenticated = 'UNAUTHENTICATED',
}
