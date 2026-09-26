/**
 * Product Analytics — funnels PostHog (website + mobile uniquement).
 * App web oubliée. Même projet PostHog, distinct_id = Supabase user.id.
 *
 * Breakdown recommandé partout : propriété `surface` (`website` | `mobile`).
 * Recréer dans PostHog : Product analytics → New funnel.
 * Filtre PostHog : ajouter une propriété sur un step quand `filter` est défini.
 */

export type FunnelStep =
  | string
  | {
      event: string;
      filter?: { property: string; value: string | boolean | number };
    };

export type FunnelInsight = {
  id: string;
  name: string;
  description: string;
  /** website | mobile | cross | product */
  scope: "website" | "mobile" | "cross" | "product";
  /** Fenêtre conversion suggérée dans PostHog */
  windowDays?: number;
  steps: readonly FunnelStep[];
  notes?: string;
};

export const POSTHOG_FUNNEL_INSIGHTS = [
  // ─── Website seul ───────────────────────────────────────────────
  {
    id: "website_creation_compte",
    name: "Site : création de compte",
    description: "CTA marketing → démarrage signup → étapes → compte créé",
    scope: "website",
    windowDays: 7,
    steps: [
      "cta_clicked",
      "auth_sign_up_started",
      "onboarding_signup_step_reached",
      "user_signed_up",
    ],
    notes: "Filtrer step 1 sur placement (join_club, hero…) si besoin.",
  },
  {
    id: "website_signup_complet",
    name: "Site : signup → onboarding terminé",
    description: "Inscription site jusqu’à fin onboarding checkout (téléphone inclus)",
    scope: "website",
    windowDays: 7,
    steps: [
      "auth_sign_up_started",
      "user_signed_up",
      "onboarding_signup_step_reached",
      "phone_verified",
      "onboarding_completed",
    ],
  },
  {
    id: "website_catalogue_vers_achat",
    name: "Site : catalogue → achat",
    description: "Vue catalogue → pièce → panier → checkout → commande",
    scope: "website",
    windowDays: 3,
    steps: [
      "catalog_viewed",
      "item_viewed",
      "cart_item_added",
      "cart_checkout_started",
      "order_confirmed",
    ],
  },
  {
    id: "website_piece_vers_achat",
    name: "Site : pièce → achat",
    description: "Vue item → ajout panier → checkout → commande",
    scope: "website",
    windowDays: 3,
    steps: ["item_viewed", "cart_item_added", "cart_checkout_started", "order_confirmed"],
  },
  {
    id: "website_intention_achat",
    name: "Site : intention d’achat",
    description: "Signal d’intent → checkout lancé (sans exiger la conversion)",
    scope: "website",
    windowDays: 1,
    steps: ["purchase_intent", "cart_checkout_started"],
  },
  {
    id: "website_abandon_checkout_achat",
    name: "Site : abandon checkout achat",
    description: "Checkout Stripe démarré sans commande confirmée (fenêtre 24h)",
    scope: "website",
    windowDays: 1,
    steps: ["cart_checkout_started", "order_confirmed"],
    notes: "Lire le taux de non-conversion (step 1 sans step 2).",
  },
  {
    id: "website_intention_abonnement",
    name: "Site : intention → abo confirmé",
    description: "Intérêt SegnaX → checkout Stripe → abonnement confirmé",
    scope: "website",
    windowDays: 7,
    steps: [
      "subscription_interest",
      "subscription_checkout_started",
      "subscription_confirmed",
    ],
  },
  {
    id: "website_abo_vers_app",
    name: "Site : abo → ouverture app",
    description: "Intérêt / checkout abo sur le site puis intention d’ouvrir l’app",
    scope: "website",
    windowDays: 7,
    steps: ["subscription_interest", "subscription_checkout_started", "app_open_intent"],
  },

  // ─── Cross : website → mobile ───────────────────────────────────
  {
    id: "cross_acquisition_site_vers_app",
    name: "Cross : site → app (acquisition)",
    description: "CTA site → intent App Store / handoff → app ouverte → signup",
    scope: "cross",
    windowDays: 14,
    steps: ["cta_clicked", "app_open_intent", "app_opened", "user_signed_up"],
    notes: "Requiert identify(user.id) sur les deux surfaces après login.",
  },
  {
    id: "cross_site_vers_activation",
    name: "Cross : site → 1ʳᵉ commande (app)",
    description: "Acquisition site puis activation produit sur mobile",
    scope: "cross",
    windowDays: 30,
    steps: [
      "cta_clicked",
      "app_open_intent",
      "user_signed_up",
      "onboarding_completed",
      "order_confirmed",
    ],
  },
  {
    id: "cross_piece_site_vers_emprunt_app",
    name: "Cross : pièce site → emprunt app",
    description: "Découverte pièce sur le site, conversion emprunt dans l’app",
    scope: "cross",
    windowDays: 14,
    steps: [
      "item_viewed",
      "app_open_intent",
      "shop_viewed",
      "cart_item_added",
      "order_confirmed",
    ],
    notes: "Step 1 souvent surface=website ; steps suivants surface=mobile.",
  },
  {
    id: "cross_abo_site_vers_app",
    name: "Cross : abo site → app",
    description: "Checkout abo sur le site puis ouverture / usage app",
    scope: "cross",
    windowDays: 14,
    steps: [
      "subscription_checkout_started",
      "subscription_confirmed",
      "app_open_intent",
      "app_opened",
    ],
  },
  {
    id: "cross_promo_app_store",
    name: "Cross : promo « Découvrir l’app »",
    description: "Clic bandeau app (panier / profil) → intent → app ouverte",
    scope: "cross",
    windowDays: 7,
    steps: ["cta_clicked", "app_open_intent", "app_opened"],
    notes: "Filtrer cta_clicked placement = cart_app_promo | profile_download_app.",
  },

  // ─── Mobile / produit (app centrale) ────────────────────────────
  {
    id: "mobile_activation_emprunteuse",
    name: "Mobile : activation emprunteuse",
    description: "Signup → onboarding → shop → panier → checkout → commande",
    scope: "mobile",
    windowDays: 14,
    steps: [
      "user_signed_up",
      "onboarding_completed",
      "shop_viewed",
      "cart_item_added",
      "cart_checkout_started",
      "order_confirmed",
    ],
    notes: "Breakdown surface=mobile. order_confirmed peut venir du serveur.",
  },
  {
    id: "mobile_onboarding_signup",
    name: "Mobile : onboarding signup",
    description: "Démarrage signup → étapes → fin onboarding (téléphone au paiement)",
    scope: "mobile",
    windowDays: 7,
    steps: [
      "auth_sign_up_started",
      "onboarding_signup_step_reached",
      "onboarding_completed",
    ],
  },
  {
    id: "mobile_onboarding_in_app",
    name: "Mobile : onboarding in-app",
    description: "Checklist post-signup (même event, filtre to_step)",
    scope: "mobile",
    windowDays: 14,
    steps: [
      { event: "onboarding_in_app_step_completed", filter: { property: "to_step", value: "profile" } },
      { event: "onboarding_in_app_step_completed", filter: { property: "to_step", value: "panier" } },
      { event: "onboarding_in_app_step_completed", filter: { property: "to_step", value: "offer" } },
      { event: "onboarding_in_app_step_completed", filter: { property: "to_step", value: "exchange" } },
    ],
  },
  {
    id: "mobile_shop_vers_emprunt",
    name: "Mobile : shop → emprunt",
    description: "Shop → ajout panier → checkout → commande",
    scope: "mobile",
    windowDays: 3,
    steps: ["shop_viewed", "cart_item_added", "cart_checkout_started", "order_confirmed"],
  },
  {
    id: "mobile_abandon_checkout",
    name: "Mobile : abandon checkout",
    description: "Checkout démarré sans commande confirmée (24h)",
    scope: "mobile",
    windowDays: 1,
    steps: ["cart_checkout_started", "order_confirmed"],
  },
  {
    id: "mobile_credits_premier_emprunt",
    name: "Mobile : crédits offerts → 1er emprunt",
    description: "Activation crédits inclus puis première commande",
    scope: "mobile",
    windowDays: 14,
    steps: ["included_credits_activated", "cart_item_added", "order_confirmed"],
  },
  {
    id: "mobile_parrainage",
    name: "Mobile : parrainage → activation",
    description: "Signup avec code → qualification → commande",
    scope: "mobile",
    windowDays: 30,
    steps: [
      { event: "user_signed_up", filter: { property: "referral_code_present", value: true } },
      "referral_qualified",
      "order_confirmed",
    ],
  },
  {
    id: "mobile_boucle_post_achat",
    name: "Mobile : boucle post-achat",
    description: "Commande → réception → retour",
    scope: "mobile",
    windowDays: 60,
    steps: ["order_confirmed", "order_received", "order_returned"],
  },
  {
    id: "mobile_abonnement_segna_x",
    name: "Mobile : abonnement Segna X",
    description: "Checkout abo → confirmation (Payment Sheet / serveur)",
    scope: "mobile",
    windowDays: 7,
    steps: ["subscription_checkout_started", "subscription_confirmed"],
  },

  // ─── Produit transversal (surface libre) ────────────────────────
  {
    id: "product_activation_globale",
    name: "Produit : activation (toutes surfaces)",
    description: "Signup → onboarding → 1ʳᵉ commande — website ou mobile",
    scope: "product",
    windowDays: 30,
    steps: ["user_signed_up", "onboarding_completed", "order_confirmed"],
    notes: "Breakdown obligatoire sur surface.",
  },
  {
    id: "product_abonnement_global",
    name: "Produit : abonnement (toutes surfaces)",
    description: "Checkout → confirmé, site ou app",
    scope: "product",
    windowDays: 14,
    steps: ["subscription_checkout_started", "subscription_confirmed"],
    notes: "Breakdown surface. Site = Stripe Checkout ; mobile = Payment Sheet.",
  },
] as const satisfies readonly FunnelInsight[];
