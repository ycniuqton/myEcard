import { Grade, KnowAnswer, ReviewMode, SettingsLimits, Status, Theme, Voice } from '@wordmap/shared'
import { z } from 'zod'

export class SchemaRules {
  static readonly DATE = /^\d{4}-\d{2}-\d{2}$/
  static readonly TIME = /^([01]\d|2[0-3]):[0-5]\d$/
  static readonly MIN_DAILY_NEW = 1
  static readonly MAX_DAILY_NEW = 100
  static readonly MAX_QUERY = 100
}

/** Reusable zod building blocks shared by several request schemas. */
export class SchemaParts {
  static readonly timestamp = z.string().refine(v => !Number.isNaN(Date.parse(v)), 'invalid ISO timestamp')
  static readonly date = z.string().regex(SchemaRules.DATE, 'expected YYYY-MM-DD')
  static readonly nonNegInt = z.number().int().min(0)

  static readonly userWord = z.object({
    wordId: z.string().min(1),
    status: z.nativeEnum(Status),
    assumed: z.boolean(),
    ease: z.number(),
    interval: SchemaParts.nonNegInt,
    reps: SchemaParts.nonNegInt,
    lapses: SchemaParts.nonNegInt,
    due: z.string().nullable(),
    firstSeenAt: z.string().nullish().transform(v => v ?? undefined),
    updatedAt: SchemaParts.timestamp,
  })

  static readonly settings = z.object({
    dailyNew: z.number().int().min(SchemaRules.MIN_DAILY_NEW).max(SchemaRules.MAX_DAILY_NEW),
    reminderTime: z.string().regex(SchemaRules.TIME).nullish().transform(v => v ?? undefined),
    theme: z.nativeEnum(Theme),
    voice: z.nativeEnum(Voice),
    activeListId: z.string().min(1),
    placementDone: z.boolean(),
    learnerName: z.string().trim().max(SettingsLimits.LEARNER_NAME_MAX).optional(),
  })

  static readonly reviewLog = z.object({
    id: z.string().min(1),
    wordId: z.string().min(1),
    at: SchemaParts.timestamp,
    mode: z.nativeEnum(ReviewMode),
    grade: z.union([z.nativeEnum(Grade), z.nativeEnum(KnowAnswer)]),
    msTaken: SchemaParts.nonNegInt.optional(),
  })

  static readonly dayStat = z.object({
    date: SchemaParts.date,
    newLearned: SchemaParts.nonNegInt,
    reviewed: SchemaParts.nonNegInt,
    goalMet: z.boolean(),
  })

  static readonly snapshot = z.object({
    version: z.number().int(),
    exportedAt: z.string(),
    settings: SchemaParts.settings,
    userWords: z.array(SchemaParts.userWord),
    reviewLogs: z.array(SchemaParts.reviewLog),
    dayStats: z.array(SchemaParts.dayStat),
  })
}

/** Zod request schemas for every endpoint. */
export class Schemas {
  static readonly wordParams = z.object({ id: z.string().min(1) })
  static readonly search = z.object({
    q: z.string().max(SchemaRules.MAX_QUERY).default(''),
    limit: z.coerce.number().int().min(1).optional(),
  })
  static readonly settingsPatch = SchemaParts.settings
    .partial()
    .extend({ reminderTime: z.string().regex(SchemaRules.TIME).nullish() })
    .strict()
  static readonly placement = z.object({
    level: SchemaParts.nonNegInt,
    tappedKnownIds: z.array(z.string().min(1)),
    probes: z.array(z.object({
      band: z.number().int().min(1),
      answers: z.array(z.object({ wordId: z.string().min(1), known: z.boolean() })),
    })),
  })
  static readonly review = z.object({
    wordId: z.string().min(1),
    grade: z.nativeEnum(Grade),
    at: SchemaParts.timestamp,
    msTaken: SchemaParts.nonNegInt.optional(),
    clientId: z.string().min(1),
  })
  static readonly session = z.object({ date: SchemaParts.date })
  static readonly day = z.object({
    date: SchemaParts.date,
    newLearned: SchemaParts.nonNegInt.optional(),
    reviewed: SchemaParts.nonNegInt.optional(),
    goalMet: z.boolean().optional(),
  })
  static readonly stats = z.object({ date: SchemaParts.date.optional() })
  static readonly sync = z.object({
    since: z.string(),
    changes: z.object({
      userWords: z.array(SchemaParts.userWord).default([]),
      reviewLogs: z.array(SchemaParts.reviewLog).default([]),
      dayStats: z.array(SchemaParts.dayStat).default([]),
      settings: SchemaParts.settings.optional(),
      settingsUpdatedAt: SchemaParts.timestamp.optional(),
    }),
  })
  static readonly snapshot = SchemaParts.snapshot
}
