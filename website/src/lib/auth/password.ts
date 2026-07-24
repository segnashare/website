/** Aligné sur `signUpPasswordSchema` (segna-app). */
export const SIGN_UP_PASSWORD_MIN_LENGTH = 8
export const SIGN_UP_PASSWORD_TOO_SHORT = '8 caractères minimum'

export function isSignUpPasswordValid(password: string): boolean {
  return password.length >= SIGN_UP_PASSWORD_MIN_LENGTH
}

export function getSignUpPasswordError(password: string): string | null {
  return isSignUpPasswordValid(password) ? null : SIGN_UP_PASSWORD_TOO_SHORT
}
