/**
 * What leaves the yard with the car.
 *
 * Deliberately short and deliberately separate from the intake's 46-item
 * condition report. A gate pass is checked at a barrier in under a minute — it
 * asks what tools went out so the same tools can be checked back in, not what
 * condition the bodywork is in. Sharing the intake list would make the guard
 * scroll past forty irrelevant rows.
 */
const OK = 'ok';
const PRESENT = 'present';

export const GATE_ITEMS = [
  { label: 'Jack', type: OK },
  { label: 'Jack Handle', type: OK },
  { label: 'Wheel Spanner', type: OK },
  { label: 'Compressor', type: OK },
  { label: 'Spare Wheel', type: PRESENT },
];

export const GATE_OPTIONS_FOR = (type) =>
  type === PRESENT ? ['Present', 'Not Present'] : ['Ok', 'Not Ok'];

/** Empty, never 'Ok' — the guard confirms each one, the form does not assume. */
export const emptyGateItems = () =>
  Object.fromEntries(GATE_ITEMS.map((i) => [i.label, '']));

/**
 * The two header columns, as the paper pass sets them: who is taking it on the
 * left, what they are taking on the right.
 */
export const TAKER_FIELDS = [
  { key: 'takerName',  label: 'Name', required: true },
  { key: 'takerPhone', label: 'Phone' },
  { key: 'takerIdNo',  label: 'ID No.' },
  { key: 'destination', label: 'Destination' },
  { key: 'mileageOut', label: 'Mileage Out', type: 'number' },
];

export const GATE_VEHICLE_FIELDS = [
  { key: 'makeModel', label: 'Make & Model' },
  { key: 'chassis',   label: 'Chassis' },
  { key: 'colour',    label: 'Colour' },
  { key: 'engineNo',  label: 'Engine No' },
  /* Blank on the way out by design — filled when the car returns, which is
     what closes the pass. */
  { key: 'mileageIn', label: 'Mileage In', type: 'number', onReturn: true },
];
