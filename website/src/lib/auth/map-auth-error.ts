/**
 * Traduit les messages d’erreur Auth (Supabase / GoTrue) pour l’UI.
 * Ne remonte jamais un message provider anglais brut au client.
 */
export function mapAuthErrorMessage(
  message: string | null | undefined,
  fallback = 'Une erreur est survenue. Réessaie.',
): string {
  const raw = (message ?? '').trim()
  const normalized = raw.toLowerCase()

  if (!normalized) return fallback

  if (
    normalized.includes('new password should be different from the old password') ||
    normalized.includes('should be different from the old') ||
    normalized.includes('same_password')
  ) {
    return "Le nouveau mot de passe doit être différent de l'ancien."
  }

  if (
    normalized.includes('password should be at least') ||
    normalized.includes('password is too short') ||
    normalized.includes('password too short')
  ) {
    return 'Le mot de passe doit faire au moins 8 caractères.'
  }

  if (
    normalized.includes('weak password') ||
    normalized.includes('password is known to be weak') ||
    normalized.includes('pwned')
  ) {
    return 'Ce mot de passe est trop faible. Choisis-en un plus robuste.'
  }

  if (
    normalized.includes('invalid login') ||
    normalized.includes('invalid credentials') ||
    normalized.includes('invalid_credentials') ||
    normalized.includes('wrong password')
  ) {
    return 'E-mail ou mot de passe incorrect.'
  }

  if (normalized.includes('email not confirmed')) {
    return 'Confirme ton e-mail avant de te connecter.'
  }

  if (
    normalized.includes('user already registered') ||
    normalized.includes('already been registered') ||
    normalized.includes('already registered')
  ) {
    return 'Un compte existe déjà avec cette adresse e-mail.'
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('only request this after') ||
    normalized.includes('for security purposes') ||
    normalized.includes('over_request_rate_limit')
  ) {
    return 'Trop de tentatives. Attends une minute puis réessaie.'
  }

  if (
    normalized.includes('error sending confirmation email') ||
    normalized.includes('error sending magic link') ||
    normalized.includes('error sending recovery email') ||
    normalized.includes('unable to send')
  ) {
    return "Impossible d'envoyer l'e-mail pour le moment. Réessaie dans quelques instants."
  }

  if (
    normalized.includes('token has expired') ||
    normalized.includes('otp_expired') ||
    normalized.includes('invalid otp') ||
    normalized.includes('otp is invalid') ||
    (normalized.includes('expired') && normalized.includes('otp')) ||
    (normalized.includes('invalid') && (normalized.includes('otp') || normalized.includes('token')))
  ) {
    return 'Code incorrect ou expiré. Renvoie un code et utilise uniquement le dernier reçu.'
  }

  if (
    normalized.includes('unable to validate email') ||
    normalized.includes('invalid email') ||
    normalized.includes('email address is invalid')
  ) {
    return 'Adresse e-mail invalide.'
  }

  if (normalized.includes('user not found') || normalized.includes('user_not_found')) {
    return "Ce compte n'existe pas."
  }

  if (normalized.includes('session') && (normalized.includes('missing') || normalized.includes('expired'))) {
    return 'Session invalide. Recommence.'
  }

  if (
    /[àâäéèêëïîôùûüçœ]/i.test(raw) ||
    /\b(impossible|réessaie|mot de passe|e-mail|compte|erreur|indique|saisis|entre)\b/i.test(raw)
  ) {
    return raw
  }

  return fallback
}
