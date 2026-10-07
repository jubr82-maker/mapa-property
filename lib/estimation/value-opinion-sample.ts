// Estimation fictive pour les PDF d'essai et le test de l'avis de valeur
// (oct. 2026). Aucune donnee reelle.
import type { ValueOpinionEstimation } from "@/lib/estimation/value-opinion-pdf";

export const VALUE_OPINION_SAMPLE: ValueOpinionEstimation = {
  id: "3f9a21c0-aaaa-bbbb-cccc-000000000000",
  created_at: "2026-10-01T10:00:00Z",
  contact_name: "Client Test",
  inputs: { type: "appartement", commune: "Strassen", surfaceLiving: 92, terrace: 12, terraceSurface: 12, bedrooms: 2, state: "good", energy: "B", rentData: { rentPerM2Month: 31.2, yieldRate: 0.03 }, comparablesPpsqm: [7710.843, 8020.1], email: "client@example.com" },
  client_output: { price_low: 690000, price_mid: 760000, price_high: 830000, confidence: "MEDIUM" },
  internal_output: {
    computed_at: "2026-10-01T10:00:00Z",
    std_deviation_pct: 6.4,
    weights_used: { observatoire: 0.5, sales_comparison: 0.3, income_capitalization: 0.2, depreciated_replacement: 0.1 },
    methods: {
      observatoire: { applicable: true, price: 770000, details: { base_per_m2: 8100 } },
      sales_comparison: { applicable: true, price: 745000, details: { n_comparables_used: 6, median_ppsqm: 7710.843 } },
      income_capitalization: { applicable: true, price: 760000, details: { rent_per_m2_month: 31.2, yield_used: 0.03 } },
      depreciated_replacement: { applicable: false, price: null, details: {} },
    },
  },
};
