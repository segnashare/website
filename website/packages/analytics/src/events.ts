/** PostHog custom events for Segna product + acquisition funnels (website ↔ mobile). */
export const ANALYTICS_EVENTS = {
  // — Acquisition (website → mobile) —
  ctaClicked: "cta_clicked",
  appOpenIntent: "app_open_intent",
  appOpened: "app_opened",

  // — Catalog / purchase intent (website) —
  itemViewed: "item_viewed",
  catalogViewed: "catalog_viewed",
  purchaseIntent: "purchase_intent",
  subscriptionInterest: "subscription_interest",

  // — Auth / onboarding —
  userSignedUp: "user_signed_up",
  authSignUpStarted: "auth_sign_up_started",
  onboardingSignupStepReached: "onboarding_signup_step_reached",
  phoneVerified: "phone_verified",
  onboardingCompleted: "onboarding_completed",

  // — Borrow / purchase funnel —
  cartCheckoutStarted: "cart_checkout_started",
  orderConfirmed: "order_confirmed",
  cartItemAdded: "cart_item_added",
  shopViewed: "shop_viewed",
  orderReceived: "order_received",
  orderReturned: "order_returned",

  // — Lend (legacy / unused) —
  itemDraftStarted: "item_draft_started",
  itemSubmitted: "item_submitted",
  itemAvailable: "item_available",
  itemPriceConfirmed: "item_price_confirmed",

  // — Activation extras —
  includedCreditsActivated: "included_credits_activated",
  onboardingInAppStepCompleted: "onboarding_in_app_step_completed",
  referralQualified: "referral_qualified",

  // — Subscription —
  subscriptionCheckoutStarted: "subscription_checkout_started",
  subscriptionConfirmed: "subscription_confirmed",

  // — Ops / SMS impact —
  notificationSent: "notification_sent",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type OnboardingInAppStep =
  | "intro"
  | "profile"
  | "kyc"
  | "panier"
  | "offer"
  | "exchange"
  | "reward"
  | "finished";

export type AnalyticsEventProperties = {
  cta_clicked: {
    cta_id?: string;
    cta_label?: string;
    cta_href?: string;
    placement?: string;
  };
  app_open_intent: {
    destination: "app_handoff" | "app_store" | "universal_link" | "deep_link";
    href?: string;
    placement?: string;
  };
  app_opened: {
    source?: "cold_start" | "deep_link" | "universal_link" | "push" | "unknown";
    path?: string;
  };
  item_viewed: {
    item_id: string;
    source?: "page" | "modal" | "strip" | "recommended" | string;
    title?: string;
    brand_label?: string;
    price_points?: number;
  };
  catalog_viewed: {
    source?: string;
    segment?: string;
    category?: string;
  };
  purchase_intent: {
    placement: string;
    item_id?: string;
    item_count?: number;
    href?: string;
  };
  subscription_interest: {
    placement: string;
    href?: string;
    plan_code?: string;
  };
  user_signed_up: {
    method: "email" | "oauth";
    referral_code_present?: boolean;
    provider?: string;
  };
  auth_sign_up_started: {
    method: "email" | "oauth";
    provider?: string;
  };
  onboarding_signup_step_reached: {
    step: string;
  };
  phone_verified: {
    surface: string;
  };
  onboarding_completed: {
    path: string;
  };
  cart_checkout_started: {
    cart_id: string;
    item_count?: number;
    already_reserved?: boolean;
    borrow_duration_days?: number;
    borrow_duration_label?: string;
  };
  order_confirmed: {
    cart_id: string;
    checkout_mode?:
      | "stripe"
      | "stripe_payment_sheet"
      | "off_session"
      | "wallet_setup"
      | "wallet_only"
      | "webhook"
      | "webhook_payment_intent"
      | "invoice"
      | "invoice_webhook";
    used_included_order?: boolean;
    item_count?: number;
    cash_paid_cents?: number;
    cart_credits_mods?: number;
    missing_credits_mods?: number;
    borrow_duration_days?: number;
    borrow_duration_label?: string;
  };
  item_draft_started: {
    item_id: string;
    is_new_draft?: boolean;
  };
  item_submitted: {
    item_id: string;
    photo_count?: number;
    onboarding_exchange_step?: boolean;
  };
  item_available: {
    item_id: string;
    owner_user_id?: string;
    source?: string;
  };
  cart_item_added: {
    item_id: string;
    cart_id?: string;
    source: string;
    trigger?: string;
  };
  included_credits_activated: {
    credits_granted?: number;
    included_credits_amount?: number;
    already_claimed?: boolean;
    source?: string;
  };
  onboarding_in_app_step_completed: {
    from_step: OnboardingInAppStep | string | null;
    to_step: OnboardingInAppStep | string;
    trigger: string;
  };
  item_price_confirmed: {
    item_id: string;
    surface: string;
  };
  referral_qualified: {
    referral_id?: string;
    referrer_user_id?: string;
    referred_user_id?: string;
    trigger?: string;
  };
  order_received: {
    cart_id: string;
    manual_confirm?: boolean;
    confirm_source?: "auto";
  };
  order_returned: {
    cart_id: string;
    phase: "return_initiated" | "return_feedback_submitted" | "return_received_segna";
  };
  shop_viewed: {
    source?: string;
  };
  subscription_checkout_started: {
    plan_code: string;
    trial_period_days?: number;
  };
  subscription_confirmed: {
    plan_code: string;
    checkout_mode?: "stripe" | "webhook" | "sync" | "payment_sheet";
    stripe_session_id?: string;
    stripe_subscription_id?: string;
  };
  notification_sent: {
    kind: string;
    channel: "sms";
    expected_goal_event: string;
    expected_goal_filter_property?: string;
    expected_goal_filter_value?: string | boolean | number;
    conversion_window_hours?: number;
    cart_id?: string;
    item_id?: string;
    idempotency_key?: string;
  };
};
