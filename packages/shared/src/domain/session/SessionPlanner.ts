import type { SessionResponse, UserWord, Word } from '../../dto'
import { Status } from '../../enums'
import { PlacementEngine } from '../placement/PlacementEngine'

export type SessionInput = {
  words: Word[]
  userWords: UserWord[]
  today: string
  dailyNew: number
  doneNew: number
}

/** Builds the daily session: capped due reviews first, then new words up to the daily goal. */
export class SessionPlanner {
  static readonly DUE_CAP = 100

  constructor(private readonly placement = new PlacementEngine()) {}

  plan(input: SessionInput): SessionResponse {
    const goalNew = input.dailyNew
    const remaining = Math.max(0, goalNew - input.doneNew)
    return {
      due: this.dueIds(input.userWords, input.today),
      fresh: this.freshIds(input, remaining),
      doneNew: input.doneNew,
      goalNew,
    }
  }

  learnMore(input: SessionInput, batch: number = input.dailyNew): string[] {
    return this.freshIds(input, batch)
  }

  dueIds(userWords: UserWord[], today: string): string[] {
    return userWords
      .filter(u => u.status !== Status.Unknown && u.due !== null && u.due <= today)
      .sort((a, b) => (a.due as string).localeCompare(b.due as string) || a.wordId.localeCompare(b.wordId))
      .slice(0, SessionPlanner.DUE_CAP)
      .map(u => u.wordId)
  }

  private freshIds(input: SessionInput, count: number): string[] {
    const started = new Set(
      input.userWords.filter(u => u.status !== Status.Unknown).map(u => u.wordId),
    )
    return this.placement
      .nextNewWords(input.words, id => !started.has(id), count)
      .map(w => w.id)
  }
}
