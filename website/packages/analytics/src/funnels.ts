/**
 * Funnels à recréer dans PostHog (Product analytics → New funnel).
 * Inclut les parcours website → mobile (même projet PostHog, même distinct_id = user.id).
 */
export const POSTHOG_FUNNEL_INSIGHTS = [
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
    name: "Onboarding signup (email)",
    description: "Email OTP → téléphone vérifié → fin onboarding signup",
    steps: ["auth_sign_up_started", "phone_verified", "onboarding_completed"],
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
