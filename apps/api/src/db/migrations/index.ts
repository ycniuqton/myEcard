import type { Migration } from '../Migration'
import { V001InitialSchema } from './V001InitialSchema'
import { V002QueryIndexes } from './V002QueryIndexes'
import { V003LearnerName } from './V003LearnerName'

/** Ordered registry of all schema migrations. */
export class MigrationRegistry {
  static all(): Migration[] {
    return [new V001InitialSchema(), new V002QueryIndexes(), new V003LearnerName()]
  }
}
