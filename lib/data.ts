export const contactInfo = {
  phone: "+65 8339 9941",
  email: "hello@theplatteringco.com",
};

export const clients = [
  "Adobe",
  "Amazon",
  "Barclays",
  "Bloomberg",
  "Coach",
  "Deloitte",
  "Netflix",
  "OpenAI",
];

/* ---------- Navigation ---------- */

export interface MenuLink {
  name: string;
  href: string;
}

export interface MenuItem {
  key: string;
  name: string;
  eyebrow?: string;
  href?: string;
  kids?: MenuLink[];
}

export const menu: MenuItem[] = [
  {
    key: "delivered",
    name: "Delivered",
    eyebrow: "Ready To Serve",
    kids: [
      { name: "Explore Delivered", href: "/#dropoff" },
      { name: "The Pot Collection", href: "/#dropoff" },
      { name: "The Centrepiece", href: "/centrepiece" },
      { name: "Delivery and Ordering", href: "/#faq-t" },
    ],
  },
  {
    key: "hosted",
    name: "Hosted",
    eyebrow: "Set Up And Served",
    kids: [
      { name: "Canapé Reception", href: "/canapes" },
      { name: "Request A Quotation", href: "/canapes/quote" },
      { name: "The Amuse-Bouche", href: "/" },
      { name: "Table Styling", href: "/#catering" },
      { name: "Christmas 2026, Hosted", href: "/#festive" },
    ],
  },
  {
    key: "occasions",
    name: "Occasions",
    eyebrow: "Shop By Occasion",
    kids: [
      { name: "Corporate", href: "/#occ-t" },
      { name: "Celebrations", href: "/#occ-t" },
      { name: "Festive", href: "/#occ-t" },
    ],
  },
  { key: "business", name: "For Business", href: "/#corp-t" },
  { key: "xmas", name: "Christmas 2026", href: "/#festive" },
  {
    key: "maison",
    name: "The Maison",
    eyebrow: "Since 2018",
    kids: [
      { name: "Our Story", href: "/" },
      { name: "Our Clients", href: "/" },
      { name: "Journal", href: "/" },
      { name: "Media & Press", href: "/" },
    ],
  },
];

export const menuSmall: MenuLink[] = [
  { name: "Contact Us", href: "/#faq-t" },
  { name: "Frequently Asked Questions", href: "/#faq-t" },
  { name: "Corporate Accounts", href: "/#corp-t" },
  { name: "My Account", href: "/" },
];

/* [name, kind, href] */
export const searchIndex: [string, string, string][] = [
  ["Delivered", "Service", "/#dropoff"],
  ["Hosted", "Service", "/#catering"],
  ["The Amuse-Bouche", "Hosted collection", "/"],
  ["The Pot Collection", "Delivered collection", "/#dropoff"],
  ["Plan Your Event", "Hosted", "/#catering"],
  ["Request A Quotation", "Hosted", "/#catering"],
  ["Table Styling", "Hosted", "/#catering"],
  ["Christmas 2026", "Seasonal", "/#festive"],
  ["Corporate", "Occasion", "/#occ-t"],
  ["Celebrations", "Occasion", "/#occ-t"],
  ["Festive", "Occasion", "/#occ-t"],
  ["For Business", "Accounts and invoicing", "/#corp-t"],
  ["Corporate account and invoicing", "For Business", "/#corp-t"],
  ["Delivery charges", "Frequently asked", "/#faq-t"],
  ["How far ahead to order", "Frequently asked", "/#faq-t"],
  ["Contact Us", "Help", "/#faq-t"],
];

export const trendingSearches = [
  "The Amuse-Bouche",
  "The Pot Collection",
  "Christmas 2026",
  "Corporate",
  "Request A Quotation",
  "Delivery charges",
];

export interface ContactRow {
  name: string;
  detail: string;
  href: string;
  external?: boolean;
}

export const contactRows: ContactRow[] = [
  { name: "Call a Client Advisor", detail: contactInfo.phone, href: "tel:+6583399941" },
  {
    name: "Message Us on WhatsApp",
    detail: `${contactInfo.phone} · ideal for urgent orders`,
    href: "https://wa.me/6583399941",
    external: true,
  },
  { name: "Write to Us", detail: contactInfo.email, href: `mailto:${contactInfo.email}` },
  {
    name: "Request a Proposal",
    detail: "Tailored for hosted events and corporate orders",
    href: "/#catering",
  },
];

/* ---------- Home page content ---------- */

export interface SplitTile {
  id: string;
  title: string;
  line: string;
  cta: string;
  href: string;
  img: string;
  alt: string;
}

export const splitTiles: SplitTile[] = [
  {
    id: "dropoff",
    title: "Delivered",
    line: "Ready to serve, at your door.",
    cta: "Shop Now",
    href: "/centrepiece",
    img: "/images/delivered.jpg",
    alt: "A uniformed attendant balancing a stack of navy Plattering Co. boxes and two black thermal bags in a wood-panelled lobby",
  },
  {
    id: "catering",
    title: "Hosted",
    line: "Set up, styled and served by our team.",
    cta: "Shop Now",
    href: "/canapes",
    img: "/images/hosted.jpg",
    alt: "The attendant placing a gold cage over canapés on a white-linen buffet with blue hydrangeas, in a wood-panelled room",
  },
];

export interface Creation {
  name: string;
  price: string;
  img: string;
  href: string;
}

export const creations: Creation[] = [
  { name: "Braised Short Rib", price: "S$ 389.00", img: "/images/braised-short-rib.jpg", href: "/centrepiece/braised-short-rib" },
  { name: "Port-Braised Beef Cheek", price: "S$ 369.00", img: "/images/port-braised-beef-cheek.jpg", href: "/centrepiece" },
  { name: "Ribeye, Thyme Béarnaise", price: "S$ 369.00", img: "/images/ribeye-bearnaise.jpg", href: "/centrepiece" },
  { name: "King Prawns, Truffle Béchamel", price: "S$ 229.00", img: "/images/king-prawns-truffle.jpg", href: "/centrepiece" },
  { name: "Black Garlic Salmon", price: "S$ 199.00", img: "/images/black-garlic-salmon.jpg", href: "/centrepiece" },
  { name: "Porchetta", price: "S$ 189.00", img: "/images/porchetta.jpg", href: "/centrepiece" },
  { name: "Bourbon-Glazed Ribs", price: "S$ 189.00", img: "/images/bourbon-glazed-ribs.jpg", href: "/centrepiece" },
  { name: "Tuscan Chicken", price: "S$ 149.00", img: "/images/tuscan-chicken.jpg", href: "/centrepiece" },
];

export const occasions = ["Office and Meetings", "Receptions", "Celebrations", "At Home"];

export const services = [
  { name: "Speak to a Client Advisor", line: "By phone, WhatsApp or email", href: "/" },
  { name: "Request a Proposal", line: "Tailored for hosted events", href: "/#catering" },
  { name: "Table Styling", line: "Everlasting, Timber, Ivory, Onyx", href: "/#catering" },
  { name: "Corporate Accounts", line: "Quotations, approvals and invoicing", href: "/#corp-t" },
];

export const footerColumns = [
  { id: "help", head: "Help", links: ["Contact Us", "Frequently Asked Questions", "Delivery and Ordering", "Order Ahead Times"] },
  { id: "svc", head: "Services", links: ["Request a Proposal", "Corporate Accounts", "Table Styling", "Loyalty"] },
  { id: "about", head: "About The Plattering Co.", links: ["Our Story", "Our Clients", "Journal", "Media & Press"] },
];
