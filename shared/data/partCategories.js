/**
 * The parts taxonomy, grouped by the system a part belongs to.
 *
 * The shop and the admin form each carried their own hardcoded list of six
 * categories, which is roughly a tenth of what a Mazda parts counter actually
 * sells and meant a filter that could never lead anywhere new. Worse, the two
 * lists were separate: nothing stopped the admin offering a category the shop
 * had no filter for.
 *
 * The original six names are preserved exactly — every part already in the
 * catalogue is filed under one of them, and renaming any of these orphans real
 * stock from its own category.
 *
 * A category with nothing in it is not a bug. The shelf is wider than what is
 * listed at any moment, and a shopper who filters to "Turbo & Supercharger"
 * and lands on "send us the part number" is a lead, not a dead end.
 */
export const PART_CATEGORY_GROUPS = [
  {
    group: 'Engine & drivetrain',
    categories: [
      'Engine Parts',
      'Filters',
      'Belts, Hoses & Gaskets',
      'Cooling & Radiators',
      'Fuel System',
      'Exhaust & Emissions',
      'Ignition & Glow Plugs',
      'Turbo & Supercharger',
      'Transmission & Clutch',
      'Drivetrain & Axles',
    ],
  },
  {
    group: 'Chassis',
    categories: [
      'Brakes & Steering',
      'Suspension',
      'Bearings & Seals',
      'Wheels & Tyres',
    ],
  },
  {
    group: 'Electrical',
    categories: [
      'Electrical',
      'Batteries & Charging',
      'Lighting',
      'Sensors & Switches',
      'Air Conditioning',
    ],
  },
  {
    group: 'Body & cabin',
    categories: [
      'Body & Exterior',
      'Glass & Mirrors',
      'Interior Accessories',
      'Seats & Trim',
    ],
  },
  {
    group: 'Service & consumables',
    categories: [
      'Oils, Fluids & Lubricants',
      'Service Kits',
      'Car Care & Accessories',
    ],
  },
];

/** Flat list, group order preserved. */
export const PART_CATEGORIES = PART_CATEGORY_GROUPS.flatMap((g) => g.categories);
