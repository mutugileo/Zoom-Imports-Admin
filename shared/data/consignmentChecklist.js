/**
 * The vehicle intake condition report.
 *
 * ONE definition drives both the form and the printed sheet. They were always
 * going to be two renders of the same thing, and two hand-maintained lists
 * drift — the admin has already been bitten three times by parallel markup
 * (the invoice button, and the vehicle price on desktop vs mobile). A single
 * array cannot disagree with itself.
 *
 * Item order and wording follow the paper form exactly, because a receiver
 * walking the car reads down the sheet in their hand and expects the screen to
 * match. Do not reorder for tidiness.
 */

/** Ok / Not Ok. The default for anything that can be damaged. */
const OK = 'ok';
/** Present / Not Present. For things that can be absent rather than broken. */
const PRESENT = 'present';
/** Free text — a brand, a count, a material. */
const TEXT = 'text';

export const CHECKLIST_GROUPS = [
  {
    title: 'Body panels',
    items: [
      { label: 'R/H Front Wing', type: OK },
      { label: 'L/H Front Wing', type: OK },
      { label: 'Front Bumper', type: OK },
      { label: 'Rear Bumper', type: OK },
      { label: 'R/H Rear Mud Guard', type: OK },
      { label: 'L/H Rear Mud Guard', type: OK },
      { label: 'R/H Front Door', type: OK },
      { label: 'R/H Rear Door', type: OK },
      { label: 'L/H Front Door', type: OK },
      { label: 'L/H Rear Door', type: OK },
      { label: 'Sliding Door', type: OK },
    ],
  },
  {
    title: 'Lights',
    items: [
      { label: 'Head Lights', type: OK },
      { label: 'Bumper Lights', type: OK },
      { label: 'Corner Lights', type: OK },
      { label: 'Rear Lights', type: OK },
    ],
  },
  {
    title: 'Locks & exterior',
    items: [
      { label: 'Fuel Tank Lock', type: OK },
      { label: 'Door Locks Outer/Inner', type: OK },
      { label: 'Lock Knobs', type: OK },
      { label: 'No. Of Mirrors', type: OK },
      { label: 'Wiper Arms & Blades', type: OK },
      { label: 'Mud Flaps', type: OK },
      { label: 'Wind Screen', type: OK },
    ],
  },
  {
    title: 'Interior',
    items: [
      { label: 'Radio Knobs', type: OK },
      { label: 'Aerial Present', type: PRESENT },
      { label: 'Interior Lights', type: OK },
      { label: 'Heater Switches/Knobs', type: OK },
      { label: 'Radio Speakers', type: OK },
      { label: 'Seat Belts', type: OK },
      { label: 'Window Winder Handles', type: OK },
      { label: 'Head Rest', type: OK },
      { label: 'Floor Carpets', type: OK },
      { label: 'Rubber Mats', type: OK },
      { label: 'Cigar Lighter', type: OK },
      { label: 'Boot Mats', type: OK },
    ],
  },
  {
    title: 'Tools & spare',
    items: [
      { label: 'Jack/Handle', type: OK },
      { label: 'Tool Kit/Brace', type: OK },
      { label: 'Washer Bag/Pump', type: OK },
      { label: 'Spare Wheel', type: PRESENT },
    ],
  },
  {
    title: 'Tyres & fittings',
    items: [
      { label: 'Left Front Tyres', type: TEXT, placeholder: 'Make' },
      { label: 'Right Front Tyres', type: TEXT, placeholder: 'Make' },
      { label: 'Left Rear Tyres', type: TEXT, placeholder: 'Make' },
      { label: 'Right Rear Tyres', type: TEXT, placeholder: 'Make' },
      { label: 'Upholstery', type: TEXT, placeholder: 'Fabric / Leather' },
      { label: 'Radio', type: TEXT, placeholder: 'Stock / Aftermarket / None' },
      { label: 'No of Keys', type: TEXT, placeholder: 'e.g. 2' },
      { label: 'Battery Make', type: TEXT },
    ],
  },
];

export const CHECKLIST_ITEMS = CHECKLIST_GROUPS.flatMap((g) => g.items);

export const OPTIONS_FOR = (type) =>
  type === PRESENT ? ['Present', 'Not Present'] : ['Ok', 'Not Ok'];

export const TYPES = { OK, PRESENT, TEXT };

/**
 * A blank report.
 *
 * Every item starts EMPTY, not 'Ok'. Defaulting to Ok would mean an untouched
 * form prints as a car in perfect condition — the receiver would be signing
 * for forty things they never looked at, which is precisely the claim the
 * document exists to defend against.
 */
export const emptyChecklist = () =>
  Object.fromEntries(CHECKLIST_ITEMS.map((i) => [i.label, '']));

/** Items still unanswered, so the form can say what is outstanding. */
export const unanswered = (items) =>
  CHECKLIST_ITEMS.filter((i) => !String(items?.[i.label] ?? '').trim()).map((i) => i.label);

/**
 * The header fields, in the two columns the paper form uses.
 *
 * Defined here for the same reason as the checklist: the form, the detail view
 * and the printed sheet are three renders of one document. The detail view was
 * quietly missing Engine No, CC, Year and Key No — it had been hand-written as
 * a separate list, and a separate list drifts. Now all three read this.
 *
 * `money` and `number` only tell the renderer how to format and which input to
 * use; the value itself is stored as typed.
 */
export const OWNER_FIELDS = [
  { key: 'ownerName',  label: 'Customer Name', required: true },
  { key: 'ownerPhone', label: 'Phone' },
  { key: 'regNo',      label: 'Veh Reg No.' },
  { key: 'mileage',    label: 'Mileage', type: 'number' },
  { key: 'year',       label: 'Year' },
  /* Never leaves a staff surface — it is the owner's floor. It prints on the
     sheet because the owner signs that sheet, and it is their own number. */
  { key: 'minPrice',   label: 'Min Price', type: 'money' },
];

export const VEHICLE_FIELDS = [
  { key: 'makeModel', label: 'Make & Model' },
  { key: 'chassis',   label: 'Chassis' },
  { key: 'colour',    label: 'Colour' },
  { key: 'keyNo',     label: 'Key No' },
  { key: 'engineNo',  label: 'Engine No' },
  { key: 'cc',        label: 'CC' },
];

export const HEADER_FIELDS = [...OWNER_FIELDS, ...VEHICLE_FIELDS];
