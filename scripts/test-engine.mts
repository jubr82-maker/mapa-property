import { estimate } from "../lib/estimation/engine";

const inputs = {
  type: "appartement" as const,
  commune: "Luxembourg",
  quartier: "Belair",
  surfaceLiving: 95,
  bedrooms: 3,
  yearBuilt: 2010,
  state: "good" as const,
  energy: "C" as const,
  parking: true,
  terrace: 12,
  floor: 3,
  totalFloors: 5,
  lift: true,
  exposureSouth: true,
};

const result = estimate(inputs);
console.log("=== Inputs ===");
console.log(`Appartement 95m² Belair, état good, CPE C, parking, terrasse 12m², 3e/5e, lift, sud`);
console.log("\n=== Client output ===");
console.log(result.client_output);
console.log("\n=== Méthodes ===");
for (const [k, m] of Object.entries(result.internal_output.methods)) {
  const det = m.applicable && m.price ? `${m.price.toLocaleString()}€` : "non applicable";
  console.log(`  ${k.padEnd(30)} ${det}`);
}
console.log(`\nweighted_price: ${result.internal_output.weighted_price.toLocaleString()}€`);
console.log(`std_dev_pct: ${result.internal_output.std_deviation_pct}%`);
console.log(`confidence_score: ${result.internal_output.confidence_score}/100`);
console.log(`\nWarnings:`);
result.internal_output.warnings.forEach((w) => console.log(`  - ${w}`));
