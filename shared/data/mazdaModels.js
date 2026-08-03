/**
 * The Mazda range, grouped the way a buyer thinks about it.
 *
 * Zoom Imports is a single-marque dealership: Mazda is the *make*, and
 * everything below is a *model*. The storefront used to call this list "makes",
 * which put "All makes" above a list containing only Mazda models — so the one
 * filter meant to narrow a search was mislabelled at the top.
 *
 * Three fields per entry, and they are not interchangeable:
 *
 *   id     what the catalogue actually stores, and what a filter compares.
 *          Existing records say "Mazda Demio", never "Mazda Demio / Mazda2",
 *          so the id has to stay the short name or every stored vehicle stops
 *          matching its own model.
 *   label  what a customer reads. Japanese-market and export names for the
 *          same car differ, and a buyer who knows it as a Mazda3 will not find
 *          "Axela" on their own.
 *   match  every name the same car is sold under. `modelOf` resolves any of
 *          them back to the one id.
 */
const M = (id, label, ...alts) => ({ id, label, match: [id, ...alts] });

export const MAZDA_MODEL_GROUPS = [
  {
    group: 'Hatchbacks & Sedans',
    models: [
      M('Carol', 'Carol'),
      M('Demio', 'Demio / Mazda2', 'Mazda2'),
      M('Axela', 'Axela / Mazda3', 'Mazda3'),
      M('Atenza', 'Atenza / Mazda6', 'Mazda6'),
      M('Verisa', 'Verisa'),
      M('Familia', 'Familia'),
      M('Flair', 'Flair'),
      M('Flair Crossover', 'Flair Crossover'),
    ],
  },
  {
    group: 'MPVs & Vans',
    models: [
      M('Premacy', 'Premacy'),
      M('Biante', 'Biante'),
      M('MPV', 'Mazda MPV'),
      M('Bongo', 'Bongo'),
      M('Scrum', 'Scrum'),
    ],
  },
  {
    group: 'SUVs & Crossovers',
    models: [
      M('CX-3', 'CX-3'),
      M('CX-30', 'CX-30'),
      M('CX-5', 'CX-5'),
      M('CX-8', 'CX-8'),
      M('CX-9', 'CX-9'),
      M('CX-50', 'CX-50'),
      M('CX-60', 'CX-60'),
      M('CX-70', 'CX-70'),
      M('CX-80', 'CX-80'),
      M('CX-90', 'CX-90'),
      M('MX-30', 'MX-30'),
    ],
  },
  {
    group: 'Sports Cars',
    models: [
      M('Roadster', 'MX-5 / Roadster', 'MX-5'),
      M('RX-8', 'RX-8'),
    ],
  },
  {
    group: 'Pickups & Commercial',
    models: [
      M('BT-50', 'BT-50'),
      M('Titan', 'Titan'),
    ],
  },
];

/** Flat list, group order preserved. */
export const MAZDA_MODELS = MAZDA_MODEL_GROUPS.flatMap((g) => g.models);

/** id → label, for printing a stored value back to a customer. */
export const labelForModel = (id) =>
  MAZDA_MODELS.find((m) => m.id === id)?.label ?? id;

/**
 * Longest match first, so a name is resolved to the most specific model it
 * could be. This is what keeps "CX-30" out of the CX-3 results and "Flair
 * Crossover" out of the Flair results — a plain `startsWith` puts both in the
 * wrong bucket, and the shorter model silently swallows the longer one.
 */
const CANDIDATES = MAZDA_MODELS
  .flatMap((m) => m.match.map((name) => ({ id: m.id, name })))
  .sort((a, b) => b.name.length - a.name.length);

/**
 * Which model a vehicle is, from its stored name. Returns null for anything
 * outside the range rather than guessing — an unrecognised car should fall out
 * of a model filter, not land in an arbitrary bucket.
 */
export const modelOf = (vehicleName) => {
  const name = String(vehicleName || '').trim().replace(/^mazda\s+/i, '');
  const lower = name.toLowerCase();

  for (const { id, name: candidate } of CANDIDATES) {
    const c = candidate.toLowerCase();
    if (!lower.startsWith(c)) continue;
    // Must end there or break on a separator: "CX-5" is not a "CX-50".
    const next = lower.charAt(c.length);
    if (next === '' || next === ' ') return id;
  }
  return null;
};

/** Does this vehicle belong to `modelId`? `'All'` matches everything. */
export const isModel = (vehicleName, modelId) =>
  modelId === 'All' || modelOf(vehicleName) === modelId;

/**
 * Every model named in a free-text fitment string.
 *
 * Compatibility rules are written by hand at the counter, so the model column
 * holds things like "Axela / Axela Sport", "Demio / Verisa" or "All Models
 * (Demio, Axela, CX-5)" rather than one tidy id. This pulls the ids back out.
 *
 * `all` is its own answer rather than a list, because "All Models" has to keep
 * meaning all models as the range grows — resolving it to today's ids would
 * quietly stop covering anything added later.
 */
export const modelsInText = (text) => {
  const raw = String(text || '').trim();
  if (/^all\s+models?\b/i.test(raw)) return { all: true, ids: new Set() };

  const ids = new Set();
  for (const token of raw.split(/[/,;+&()]|\band\b/i)) {
    const id = modelOf(token.trim());
    if (id) ids.add(id);
  }
  return { all: false, ids };
};
