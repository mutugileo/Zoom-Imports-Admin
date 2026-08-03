import { modelsInText, modelOf } from '../data/mazdaModels.js';

/**
 * Fitment rules, resolved against the catalogue.
 *
 * Rules used to point at a part by its *name*. Renaming "Brake Pad Set" to
 * "Brake Pad Set (Front)" in the parts screen silently orphaned every rule
 * attached to it — the shop kept filtering, just against nothing, and there was
 * no error anywhere to notice. Worse, the admin form defaulted the field to a
 * name no part actually had, so a rule saved without editing it was born
 * broken.
 *
 * Rules now carry `partId`. Older rules only have the name, so it is matched
 * once here and cached — migrate on read, never rewrite silently on load.
 */
export const rulePartId = (rule, parts = []) => {
  if (rule.partId != null) return rule.partId;
  const key = String(rule.part ?? '').trim().toLowerCase();
  if (!key) return null;
  return parts.find((p) => String(p.name).trim().toLowerCase() === key)?.id ?? null;
};

/**
 * Which models a rule covers.
 *
 * `modelIds` is what the admin form writes now — an explicit list, so nothing
 * depends on parsing prose. Rules written before that only have the free-text
 * model column, which still has to be understood.
 */
export const ruleModels = (rule) => {
  if (Array.isArray(rule.modelIds) && rule.modelIds.length > 0) {
    return {
      all: rule.modelIds.includes('All'),
      ids: new Set(rule.modelIds.filter((m) => m !== 'All')),
    };
  }
  return modelsInText(rule.model);
};

/**
 * Fitment index for the shop: part id → the models it is confirmed against,
 * plus the first rule for each part as the headline shown on a card.
 */
export const buildFitmentIndex = (rules = [], parts = []) => {
  const modelsByPart = new Map();
  const ruleByPart = new Map();

  for (const rule of rules) {
    const id = rulePartId(rule, parts);
    if (id == null) continue; // orphaned rule — points at no part we hold

    if (!modelsByPart.has(id)) modelsByPart.set(id, { all: false, ids: new Set() });
    const entry = modelsByPart.get(id);
    const { all, ids } = ruleModels(rule);
    if (all) entry.all = true;
    for (const m of ids) entry.ids.add(m);

    if (!ruleByPart.has(id)) ruleByPart.set(id, rule);
  }

  return { modelsByPart, ruleByPart };
};

/** Rules that point at no part in the catalogue — surfaced in the admin table. */
export const orphanedRules = (rules = [], parts = []) =>
  rules.filter((r) => rulePartId(r, parts) == null);

/**
 * The reverse lookup: which parts fit a given vehicle.
 *
 * The rules only ever ran one direction — pick a model on the parts page and
 * the catalogue narrows. Nothing asked the opposite question, so a customer
 * reading a CX-5 listing was never shown the CX-5 parts on the shelf, even
 * though the data to answer it was already indexed.
 *
 * Two things count as a fit, matching what the shop's filter already accepts:
 * an admin rule linking the part to this model, or the part's own `compat`
 * field naming it. `compat` is resolved through `modelOf` so a part filed under
 * "Mazda2" still answers to a Demio.
 *
 * `all: true` rules ("fits all models") are included — a universal filter does
 * fit this car — but they sort last, because a listing should lead with the
 * parts chosen for that model rather than the ones that fit anything.
 */
export const partsForVehicle = (vehicleName, parts = [], rules = []) => {
  const model = modelOf(vehicleName);
  if (!model) return [];

  const { modelsByPart } = buildFitmentIndex(rules, parts);

  const scored = [];
  for (const part of parts) {
    const entry = modelsByPart.get(part.id);
    const namedByRule = entry ? entry.ids.has(model) : false;
    const namedByField = modelOf(part.compat) === model;
    const universal = entry ? entry.all : false;

    if (namedByRule || namedByField) scored.push({ part, rank: 0 });
    else if (universal) scored.push({ part, rank: 1 });
  }

  return scored
    .sort((a, b) => a.rank - b.rank || (b.part.stock ?? 0) - (a.part.stock ?? 0))
    .map((s) => s.part);
};
