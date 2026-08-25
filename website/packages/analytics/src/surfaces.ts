/** Client surface for PostHog super-property + event props (same PostHog project). */
export const ANALYTICS_SURFACES = {
  website: "website",
  mobile: "mobile",
  /** Server / API captures from segna-app backends. */
  server: "server",
} as const;

export type AnalyticsSurface = (typeof ANALYTICS_SURFACES)[keyof typeof ANALYTICS_SURFACES];
