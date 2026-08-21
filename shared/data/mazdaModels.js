/**
 * The Mazda range, grouped the way a buyer thinks about it.
 *
 * Each model is treated as a distinct vehicle option (e.g. Mazda 3, Mazda Axela,
 * Mazda 6, and Mazda Atenza are treated independently).
 */
const M = (id, label, ...alts) => ({ id, label, match: [id, ...alts] });

export const MAZDA_MODEL_GROUPS = [
  {
    group: 'Hatchbacks & Sedans',
    models: [
      M('Mazda3', 'Mazda 3', 'Mazda 3', 'Mazda3', 'BP Fastback', 'BP Sedan', '3 Fastback', '3 Sedan'),
      M('Axela', 'Mazda Axela', 'Axela', 'Axela Sport', 'Axela Hybrid', 'Mazda Axela', 'Axela Sedan'),
      M('Mazda6', 'Mazda 6', 'Mazda 6', 'Mazda6', 'GL Wagon', 'GL Sedan', '6 Wagon', '6 Sedan'),
      M('Atenza', 'Mazda Atenza', 'Atenza', 'Atenza Wagon', 'Atenza Sedan', 'Mazda Atenza'),
      M('Demio', 'Demio / Mazda2', 'Demio', 'Mazda2', 'Mazda 2', 'Mazda Demio'),
      M('Verisa', 'Verisa'),
      M('Carol', 'Carol'),
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
      M('Roadster', 'MX-5 / Roadster', 'MX-5', 'Miata', 'Roadster'),
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

/** id → label, for printing a stored value back to a customer. Case-insensitive. */
export const labelForModel = (id) => {
  if (!id) return '';
  const match = MAZDA_MODELS.find(
    (m) => m.id.toLowerCase() === String(id).toLowerCase()
  );
  return match?.label ?? id;
};

/**
 * Longest match first, so a name is resolved to the most specific model it
 * could be. This is what keeps "CX-30" out of the CX-3 results and "Flair
 * Crossover" out of the Flair results.
 */
const CANDIDATES = MAZDA_MODELS
  .flatMap((m) => m.match.map((name) => ({ id: m.id, name })))
  .sort((a, b) => b.name.length - a.name.length);

/**
 * Which model a vehicle is, from its stored name. Returns null for anything
 * outside the range rather than guessing.
 */
export const modelOf = (vehicleName) => {
  const name = String(vehicleName || '').trim().replace(/^mazda\s+/i, '');
  const lower = name.toLowerCase();

  for (const { id, name: candidate } of CANDIDATES) {
    const c = candidate.toLowerCase();
    if (!lower.startsWith(c)) continue;
    // Must end there or break on a separator: "CX-5" is not a "CX-50".
    const next = lower.charAt(c.length);
    if (next === '' || next === ' ' || next === '/') return id;
  }
  return null;
};

/** Does this vehicle belong to `modelId`? Strict distinct vehicle matching ('All' matches everything). */
export const isModel = (vehicleName, modelId) => {
  if (!modelId || modelId === 'All') return true;
  const target = String(modelId).trim().toLowerCase();
  const found = modelOf(vehicleName);
  if (!found) return false;

  return found.toLowerCase() === target;
};

/**
 * Every model named in a free-text fitment string.
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
