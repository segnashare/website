/**
 * Funnels à recréer dans PostHog (Product analytics → New funnel).
 * Website ↔ mobile, même projet PostHog, distinct_id = user.id.
 * (Plus de funnel prêt — le dépôt de pièces n’est plus un parcours produit.)
 */
export const POSTHOG_FUNNEL_INSIGHTS = [
  {
    id: "website_item_vers_achat",
    name: "Site : pièce → achat",
    description: "Vue item → ajout panier → checkout → commande",
    steps: ["item_viewed", "cart_item_added", "cart_checkout_started", "order_confirmed"],
  },
  {
    id: "website_intention_abonnement",
    name: "Site : intention abonnement",
    description: "Intérêt SegnaX → checkout Stripe → confirmé",
    steps: ["subscription_interest", "subscription_checkout_started", "subscription_confirmed"],
  },
  {
    id: "website_creation_compte",
    name: "Site : création de compte",
    description: "CTA → signup started → steps → compte créé",
    steps: [
      "cta_clicked",
      "auth_sign_up_started",
      "onboarding_signup_step_reached",
      "user_signed_up",
    ],
  },
  {
    id: "acquisition_site_vers_mobile",
    name: "Acquisition site → mobile",
    description: "CTA site → intention d’ouvrir l’app → signup → onboarding → 1er emprunt",
    steps: [
      "cta_clicked",
      "app_open_intent",
      "user_signed_up",
      "onboarding_completed",
      "order_confirmed",
    ],
  },
  {
    id: "activation_emprunteuse",
    name: "Activation emprunteuse",
    description: "Signup → onboarding → shop → panier → checkout → commande payée",
    steps: [
      "user_signed_up",
      "onboarding_completed",
      "shop_viewed",
      "cart_item_added",
      "cart_checkout_started",
      "order_confirmed",
    ],
  },
  {
    id: "onboarding_signup",
    name: "Onboarding signup",
    description: "Étapes signup (filtre `step`) → téléphone → fin onboarding",
    steps: [
      "auth_sign_up_started",
      "onboarding_signup_step_reached",
      "phone_verified",
      "onboarding_completed",
    ],
  },
  {
    id: "onboarding_in_app",
    name: "Onboarding in-app",
    description: "Même event, filtre `to_step` à chaque step PostHog",
    steps: [
      { event: "onboarding_in_app_step_completed", filter: { property: "to_step", value: "profile" } },
      { event: "onboarding_in_app_step_completed", filter: { property: "to_step", value: "panier" } },
      { event: "onboarding_in_app_step_completed", filter: { property: "to_step", value: "offer" } },
      { event: "onboarding_in_app_step_completed", filter: { property: "to_step", value: "exchange" } },
    ],
  },
  {
    id: "credits_offerts_premier_emprunt",
    name: "Crédits offerts → 1er emprunt",
    steps: ["included_credits_activated", "cart_item_added", "order_confirmed"],
  },
  {
    id: "parrainage_activation",
    name: "Parrainage → activation",
    description: "Step 1 : filtre `referral_code_present` = true sur `user_signed_up`",
    steps: [
      { event: "user_signed_up", filter: { property: "referral_code_present", value: true } },
      "referral_qualified",
      "order_confirmed",
    ],
  },
  {
    id: "abandon_checkout",
    name: "Abandon checkout",
    description: "Réservation panier sans commande confirmée (fenêtre 24h)",
    steps: ["cart_checkout_started", "order_confirmed"],
  },
  {
    id: "shop_vers_emprunt",
    name: "Shop → emprunt",
    steps: ["shop_viewed", "cart_item_added", "cart_checkout_started", "order_confirmed"],
  },
  {
    id: "boucle_post_achat",
    name: "Boucle post-achat",
    steps: ["order_confirmed", "order_received", "order_returned"],
  },
  {
    id: "abonnement_segna_x",
    name: "Abonnement Segna X",
    description: "Peut démarrer sur le site (recap) et se confirmer via API / mobile",
    steps: ["subscription_checkout_started", "subscription_confirmed"],
  },
  {
    id: "abonnement_site_vers_app",
    name: "Abonnement site → app",
    description: "CTA / checkout abonnement sur le site → ouverture app",
    steps: ["cta_clicked", "subscription_checkout_started", "app_open_intent"],
  },
] as const;
