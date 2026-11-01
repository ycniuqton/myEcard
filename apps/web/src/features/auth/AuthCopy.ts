import { AuthErrorCode } from '../../auth/AuthTypes'
import { FieldProblem } from '../../auth/AuthRules'

/** User-facing copy of the account screens. */
export class AuthCopy {
  static readonly BRAND = 'WordMap'
  static readonly EMAIL = 'Email'
  static readonly PASSWORD = 'Password'
  static readonly NEW_PASSWORD = 'New password'
  static readonly CONFIRM = 'Confirm password'
  static readonly BACK_TO_LOGIN = 'Back to log in'
  static readonly BUSY = 'Please wait'

  static readonly LOGIN_TITLE = 'Welcome back'
  static readonly LOGIN_SUB = 'Log in to pick up where you left off.'
  static readonly LOGIN_SUBMIT = 'Log in'
  static readonly FORGOT_LINK = 'Forgot password?'
  static readonly SIGNUP_LINK = 'New here? Create an account'

  static readonly SIGNUP_TITLE = 'Create your account'
  static readonly SIGNUP_SUB = 'Your progress is saved to your account and follows you across devices.'
  static readonly SIGNUP_SUBMIT = 'Create account'
  static readonly LOGIN_LINK = 'Already have an account? Log in'
  static readonly CHECK_TITLE = 'Check your email'
  static readonly CONFIRM_SENT = 'We sent a confirmation link to'
  static readonly CONFIRM_NEXT = 'Open it, then come back and log in.'

  static readonly FORGOT_TITLE = 'Reset your password'
  static readonly FORGOT_SUB = 'Enter your email and we will send you a reset link.'
  static readonly FORGOT_SUBMIT = 'Send reset link'
  static readonly RESET_SENT_PREFIX = 'If an account exists for'
  static readonly RESET_SENT_SUFFIX = 'a reset link is on its way.'

  static readonly RESET_TITLE = 'Choose a new password'
  static readonly RESET_SUB = 'Use at least 8 characters.'
  static readonly RESET_SUBMIT = 'Update password'

  static readonly ACCOUNT_TITLE = 'Account'
  static readonly SIGNED_IN_AS = 'Signed in as'
  static readonly LOGOUT = 'Log out'
  static readonly LOGGING_OUT = 'Logging out'

  static readonly LEGACY_TITLE = 'Upload your progress from this device?'
  static readonly LEGACY_BODY = 'We found learning progress saved on this device from before accounts. Upload it to this account so it is not lost.'
  static readonly LEGACY_UPLOAD = 'Upload'
  static readonly LEGACY_LATER = 'Not now'
  static readonly LEGACY_FAILED = 'Upload failed. Check your connection and try again.'
  static readonly LOADING = 'Loading'

  private static readonly PROBLEMS: Record<FieldProblem, string> = {
    [FieldProblem.EmailRequired]: 'Enter your email address.',
    [FieldProblem.EmailInvalid]: 'That email address does not look right.',
    [FieldProblem.PasswordRequired]: 'Enter your password.',
    [FieldProblem.PasswordTooShort]: 'Use at least 8 characters.',
    [FieldProblem.PasswordMismatch]: 'The two passwords do not match.',
  }

  private static readonly ERRORS: Record<AuthErrorCode, string> = {
    [AuthErrorCode.InvalidCredentials]: 'Wrong email or password. Please try again.',
    [AuthErrorCode.EmailTaken]: 'An account with this email already exists. Try logging in instead.',
    [AuthErrorCode.EmailNotConfirmed]: 'Please confirm your email first. Check your inbox for the link.',
    [AuthErrorCode.WeakPassword]: 'That password is too weak. Use at least 8 characters.',
    [AuthErrorCode.InvalidEmail]: 'That email address does not look right.',
    [AuthErrorCode.RateLimited]: 'Too many attempts. Please wait a minute and try again.',
    [AuthErrorCode.NoSession]: 'Your session has expired. Please log in again.',
    [AuthErrorCode.Network]: 'Could not reach the server. Check your connection and try again.',
    [AuthErrorCode.NotConfigured]: 'Accounts are not configured for this build.',
    [AuthErrorCode.Unknown]: 'Something went wrong. Please try again.',
  }

  static problem(problem: FieldProblem | null): string | null {
    return problem ? AuthCopy.PROBLEMS[problem] : null
  }

  static errorText(error: unknown): string {
    const code = (error as { code?: AuthErrorCode } | null)?.code
    return (code && AuthCopy.ERRORS[code]) || AuthCopy.ERRORS[AuthErrorCode.Unknown]
  }
}
