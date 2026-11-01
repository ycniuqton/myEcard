export enum FieldProblem {
  EmailRequired = 'emailRequired',
  EmailInvalid = 'emailInvalid',
  PasswordRequired = 'passwordRequired',
  PasswordTooShort = 'passwordTooShort',
  PasswordMismatch = 'passwordMismatch',
}

/** Client-side validation of the auth forms; each check returns a problem or null. */
export class AuthRules {
  static readonly MIN_PASSWORD = 8
  static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  static email(value: string): FieldProblem | null {
    const email = value.trim()
    if (!email) return FieldProblem.EmailRequired
    return AuthRules.EMAIL_PATTERN.test(email) ? null : FieldProblem.EmailInvalid
  }

  static passwordPresent(value: string): FieldProblem | null {
    return value ? null : FieldProblem.PasswordRequired
  }

  static password(value: string): FieldProblem | null {
    return value.length >= AuthRules.MIN_PASSWORD ? null : FieldProblem.PasswordTooShort
  }

  static confirm(password: string, confirm: string): FieldProblem | null {
    return password === confirm ? null : FieldProblem.PasswordMismatch
  }

  static normalizeEmail(value: string): string {
    return value.trim().toLowerCase()
  }
}
