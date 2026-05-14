/**
 * Types partagés pour le système de tracking unifié.
 * Voir migration 20260514120000_tracking_events.sql pour le schéma BDD.
 */

export type TrackingEventType =
  | "page_view"
  | "cta_click"
  | "form_step_complete"
  | "form_submit"
  | "contact_reveal"
  | "property_view"
  | "property_favorite"
  | "estimation_compute"
  | "emprunt_simulate"
  | "rendement_simulate"
  | "search_query"
  | "scroll_depth_75"
  | "exit_intent"
  | "bounce";

export interface TrackEventPayload {
  event_type: TrackingEventType;
  event_data?: Record<string, unknown>;
  page?: string;
  referrer?: string;
  locale?: string;
}

export const SESSION_COOKIE_NAME = "mp_sess";
export const SESSION_TTL_DAYS = 90;
