export class PGlite {
  static async create() {
    throw new Error('PGlite is not available in the serverless build; set DATABASE_URL')
  }
}
