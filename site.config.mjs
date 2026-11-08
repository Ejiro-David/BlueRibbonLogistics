// ─────────────────────────────────────────────────────────────────────────────
//  Blue Ribbon Logistics: everything you are likely to change lives here.
//  After editing, run:  npm run build   (the finished site is written to dist/)
// ─────────────────────────────────────────────────────────────────────────────

export default {
  // WhatsApp number in international format, no "+" and no leading 0.
  // Example: '2348012345678'. Left empty, WhatsApp asks the visitor who to send to.
  whatsappNumber: '2349074501560',   // +234 907 450 1560

  // Meta Pixel: paste only the Pixel ID (the number inside fbq('init', '…') in
  // the code Meta gives you). Left empty, no Pixel loads.
  metaPixelId: '',

  // The live address, once there is a domain, e.g. 'https://blueribbonlogistics.ng'.
  // Used for the canonical link and for link previews on WhatsApp / Facebook.
  siteUrl: '',

  // Call line: shown in the footer ("Call 0815 852 7977") and to Google. '' hides it.
  telephone: '+2348158527977',

  // Pre-typed WhatsApp messages. {SRC} becomes the ref code from ?src= (default SITE).
  messages: {
    book: "Hi Blue Ribbon 👋 I'd like to book a delivery.\nPickup: \nDrop-off: \nItem: \nPay on delivery? (Yes/No)\n(ref: {SRC})",
    vendor: "Hi Blue Ribbon, I'm a vendor and I'd like to set up regular deliveries. (ref: {SRC}-VENDOR)",
    area: 'Hi Blue Ribbon, do you deliver to {AREA}? (ref: {SRC}-AREA)',
  },

  // The orange strip under the hero.
  offer: {
    enabled: true,               // false = hide the strip completely
    endsAfter: '2026-11-29',     // the strip hides itself after this day (Benin City time). '' = never
    label: 'Current offer: Referral Reward. Refer a new customer and win cash, 9 to 29 November.', // read aloud by screen readers
    items: [                     // ₦ is drawn in the brand style automatically
      'Referral Reward',
      'Refer a new customer, win cash',
      '1st ₦7,000',
      '2nd ₦5,000',
      '3rd ₦3,000',
      '9–29 November',
    ],
  },

  // Prices section.
  prices: {
    from: 2500,                  // "Deliveries from ₦2,500" (counts up on screen)
    recentRuns: [
      { from: 'Ekosodin', to: 'Isihor', price: 2500 },
      { from: 'BDPA', to: 'Ewere Street', price: 3000 },
      { from: 'Upper Ekenwan', to: 'Sapele Road', price: 8000 },
      { from: 'Okhun', to: 'Upper Sakponba', price: 9000 },
    ],
  },

  // Areas: two moving rows on the page. The hero chip "26 areas and counting"
  // uses the total, so it stays right when you add one.
  areas: [
    ['Ugbowo', 'Ekosodin', 'BDPA', 'Iyaro', 'Ogbeson', 'New Benin', 'Ibiwe', 'Ihama',
      'Irhirhi', 'Eagle Line', 'Upper Ekenwan', 'Sapele Road', 'UBTH'],
    ['Boundary Road', 'Aduwawa', 'Upper Mission', 'Omore Road', 'Isihor', 'Okhun',
      'Upper Sakponba', 'Iyare', 'Ring Road', 'Airport Road', 'Evidence', 'Uwasota', 'Edo Street'],
  ],

  // Questions section, in order.
  faq: [
    { q: 'How do I book?', a: 'Tap any "Book on WhatsApp" button. The message opens already started, so you only fill in the pickup, the drop-off and the item.' },
    { q: 'How much does it cost?', a: 'Deliveries in Benin City start from ₦2,500. We send you the exact price on WhatsApp before pickup.' },
    { q: 'Can you collect payment for me?', a: 'Yes. The rider collects the payment from your customer at the door, and we send it on to you.' },
    { q: 'Do you deliver outside Benin City?', a: 'We take packages to the park and send them on by waybill to Lagos and other states.' },
    { q: 'Can you bring something back?', a: 'Yes. We can drop off one item and bring another back, or pick up from two places on one run.' },
  ],

  // Rider artwork: 'photo' uses the realistic rider (assets/img/rider), 'svg' the drawn bike.
  rider: 'photo',
};
