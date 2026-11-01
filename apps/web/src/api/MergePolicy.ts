import type { DayStat, UserWord } from '@wordmap/shared'

/** Conflict rules: last-writer-wins on updatedAt for words, monotonic merge for day counters. */
export class MergePolicy {
  userWord(local: UserWord | undefined, remote: UserWord): UserWord {
    if (!local) return remote
    return remote.updatedAt >= local.updatedAt ? remote : local
  }

  dayStat(local: DayStat | undefined, remote: DayStat): DayStat {
    if (!local) return remote
    return {
      date: remote.date,
      newLearned: Math.max(local.newLearned, remote.newLearned),
      reviewed: Math.max(local.reviewed, remote.reviewed),
      goalMet: local.goalMet || remote.goalMet,
    }
  }

  changedUserWords(locals: (UserWord | undefined)[], remotes: UserWord[]): UserWord[] {
    const out: UserWord[] = []
    remotes.forEach((remote, i) => {
      const merged = this.userWord(locals[i], remote)
      if (merged !== locals[i] && !this.same(merged, locals[i])) out.push(merged)
    })
    return out
  }

  changedDayStats(locals: (DayStat | undefined)[], remotes: DayStat[]): DayStat[] {
    return remotes
      .map((remote, i) => this.dayStat(locals[i], remote))
      .filter((merged, i) => !this.same(merged, locals[i]))
  }

  private same(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
  }
}
