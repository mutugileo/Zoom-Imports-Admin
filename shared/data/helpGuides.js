/**
 * How to use the portal, as tasks rather than as screens.
 *
 * People arrive with a job — "a car just came in, what do I do?" — not
 * wanting to study a menu. So each card is a job, and it names the screen it
 * happens on rather than the other way round.
 *
 * `needs` is the view the task lives on. The Help page filters on it with the
 * same canView() the sidebar uses, so nobody is taught a screen they cannot
 * open. A guide to a page that refuses to load teaches people the app is
 * broken.
 */

export const HELP_GUIDES = [
  {
    id: 'undo',
    title: 'Things you cannot undo',
    /* First, not last. Every one of these is enforced by the database, so
       there is no support call that reverses them — someone will meet one in
       their first week and should meet it here instead. */
    lede: 'Most things in the portal can be corrected. These cannot, by anyone.',
    tone: 'caution',
    needs: null,
    steps: [
      'Signing off a vehicle intake. The condition report locks permanently. Check the sheet before you sign — corrections go on a new intake.',
      'Issuing a gate pass. Everything the driver agreed at the gate freezes. Only the return mileage can still be added.',
      'Recording a return. This closes the gate pass for good.',
      'Deleting a draft. Drafts can be deleted; signed and issued records cannot, and that is deliberate.',
    ],
    closing: 'If you are unsure, save it as a draft and come back. A draft costs nothing.',
  },
  {
    id: 'signin',
    title: 'Signing in and out',
    lede: 'The portal is built for a shared counter terminal.',
    needs: null,
    steps: [
      'Enter your email, then your 4-digit PIN.',
      'Your name shows at the bottom of the sidebar. Check it is yours before you start — actions are recorded against whoever is signed in.',
      'Sign out from the bottom of the sidebar when you step away.',
      'The portal locks itself after 20 minutes of no activity, with a warning first.',
      'To change your own PIN, go to Settings. You do not need a Superadmin for that.',
    ],
  },
  {
    id: 'receive',
    title: 'Receiving a car on consignment',
    lede: 'A car brought in by an owner for you to sell on their behalf. These never appear on the website.',
    needs: 'admin-consignments',
    steps: [
      'Consignments → Receive a vehicle.',
      'Fill in the owner and the vehicle. Min price is the floor the owner agrees to — it is internal and never shown on the website.',
      'Walk the car and record each item as Ok or Not Ok. Nothing is ticked for you; a blank means nobody checked it.',
      'Add comments for anything the list does not cover — missing towing caps, scratches.',
      'Type both names: the owner, and whoever received it.',
      'Save. It stays a draft and can still be edited.',
      'When you and the owner agree it is right, Sign off. This locks it and adds the stamp.',
      'Print intake sheet, and give the owner a copy.',
    ],
  },
  {
    id: 'gatepass',
    title: 'Letting a car leave the yard',
    lede: 'Any car going out — test drive, garage, owner collection. Yard stock and consignments both.',
    needs: 'admin-gate-passes',
    steps: [
      'Gate Passes → Release a vehicle.',
      'Pick the car from yard stock or consignments. Its details fill in for you.',
      'Record who is taking it, their ID number, where it is going and why.',
      'Tick what goes with it: jack, spanner, spare wheel.',
      'Save, then Issue & release. Print the pass and give it to the driver.',
      'When the car comes back: open the pass, Record return, enter the mileage.',
      'The Out tab shows every vehicle currently off the premises. That is the list to check at the end of a day.',
    ],
  },
  {
    id: 'addvehicle',
    title: 'Putting a car on the website',
    lede: 'Cars you own and are selling yourself.',
    needs: 'admin-vehicles',
    steps: [
      'Vehicles → Add Vehicle.',
      'Fill in the details. Expected arrival is for cars still on the way — customers see it as a month, not a date.',
      'Add photos. The first one is the cover. Drag to reorder.',
      'Save. Cars you add go live straight away; only seller submissions need approving.',
      'Use Feature on site to put a car on the homepage.',
    ],
  },
  {
    id: 'sell',
    title: 'Selling a car',
    lede: 'From marking it sold to handing over an invoice.',
    needs: 'admin-vehicles',
    steps: [
      'Vehicles → Mark sold on the car, and enter what it actually sold for.',
      'Record the buyer. Their details and the car details are copied onto the record, so later edits to the listing do not change the sale.',
      'Choose the bank account for this sale. It is printed on the invoice.',
      'Open the car and choose Generate invoice, or find the buyer under Buyers.',
      'Print / Save as PDF.',
    ],
  },
  {
    id: 'quote',
    title: 'A quotation for a walk-in',
    lede: 'Someone asks for an invoice for a car they have not bought yet.',
    needs: 'admin-vehicles',
    steps: [
      'Open any vehicle and choose Generate invoice — the car does not need to be sold.',
      'Type the customer name in the Bill To box.',
      'It prints as a quotation, numbered ZM4-Q-, so it cannot be confused with a real sale invoice.',
      'Nothing is saved. A quotation does not create a buyer.',
    ],
  },
  {
    id: 'parts',
    title: 'Spare parts and orders',
    needs: 'admin-parts',
    steps: [
      'Spare Parts → Add part. Give it a stock code so it can be found.',
      'Set the stock count. The website will not let a customer order more than you have.',
      'Use Compatibility to say which models a part fits, so it shows on the right car pages.',
      'Orders shows what customers have ordered from the website.',
    ],
  },
  {
    id: 'customers',
    title: 'Enquiries, reviews and seller listings',
    needs: 'admin-enquiries',
    steps: [
      'Enquiries: everything customers send from the website. Work down the list and mark them as handled.',
      'Reviews arrive as Pending. Nothing appears on the website until you publish it.',
      'Cars and parts submitted by the public also arrive as Pending. Approve them on the Vehicles or Spare Parts screen before they appear.',
    ],
  },
  {
    id: 'sitecontent',
    title: 'Changing the website',
    needs: 'admin-content',
    steps: [
      'Site Content holds the homepage banners, the About page wording, FAQs and your contact details.',
      'Website switches turns features on and off — including whether the public can list their own cars.',
      'Invoice & Bank Details is where your company name, KRA PIN and bank accounts live. These print on invoices and intake sheets.',
      'Featured Vehicles picks what shows on the homepage.',
    ],
  },
  {
    id: 'history',
    title: 'Finding something from before',
    needs: 'admin-history',
    steps: [
      'History & Archive holds sold vehicles, signed intakes and gate passes.',
      'Opening any of them reprints the original document exactly as it was issued.',
      'Recycle Bin holds deleted vehicles and can restore them.',
      'Signed intakes and issued gate passes cannot be deleted from anywhere.',
    ],
  },
];
