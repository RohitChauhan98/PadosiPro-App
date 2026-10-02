export interface CatalogueTask {
  name: string;
  description: string;
}

export interface CatalogueCategory {
  name: string;
  tasks: CatalogueTask[];
}

/**
 * 10 Live categories from padosipro.com, ~12 tasks each (120 total).
 * Coming-soon tracks (NutriFix, Fashion & Styling, Business Support,
 * Education Support) are intentionally excluded.
 *
 * Seeding upserts by name, so existing user selections keep working when the
 * catalogue grows; descriptions and category moves are updated in place.
 */
export const CATALOGUE: CatalogueCategory[] = [
  {
    name: 'Digital & Tech Help',
    tasks: [
      { name: 'App Installation & Training', description: 'Set up apps and walk family members through using them' },
      { name: 'CCTV Setup', description: 'Camera installation with remote viewing configured for you' },
      { name: 'Cyber Safety Assistance', description: 'Scam checks, account security and safe online habits' },
      { name: 'Data Backup & Recovery', description: 'Back up photos and files, and recover them when devices fail' },
      { name: 'Device Troubleshooting', description: 'Fix phones, laptops and smart devices that stopped working' },
      { name: 'Email & Account Setup', description: 'New email, accounts and password managers set up properly' },
      { name: 'Home Wi-Fi Setup', description: 'Router setup, mesh networks and dead-zone fixes' },
      { name: 'Laptop Repair', description: 'Diagnosis and repair for laptops and desktops at home' },
      { name: 'Parental Control Setup', description: 'Screen-time limits and safe browsing for kids’ devices' },
      { name: 'Phone & Laptop Setup', description: 'New device setup, data transfer and essentials installed' },
      { name: 'Smart Home & Automation', description: 'Smart locks, lights and home automation installed and explained' },
      { name: 'Smart TV & Home Setup', description: 'TV mounting, streaming apps and home theatre configuration' },
    ],
  },
  {
    name: 'Errands & Daily Tasks',
    tasks: [
      { name: 'Bank Work', description: 'Queue-free bank runs: deposits, drafts, KYC and paperwork' },
      { name: 'Bill Payments', description: 'Electricity, water, gas and society bills paid on time' },
      { name: 'Car Wash', description: 'Doorstep exterior and interior car cleaning' },
      { name: 'Courier Pickup & Drop', description: 'Parcels collected, packed and sent or received for you' },
      { name: 'Document Printing & Notarization', description: 'Printing, scanning and notarization handled end to end' },
      { name: 'Document Pickup & Drop', description: 'Papers collected and delivered between offices and home' },
      { name: 'Grocery Pickup & Restocking', description: 'Regular grocery runs and pantry restocking on a rhythm' },
      { name: 'Laundry', description: 'Wash, iron and dry-clean pickup and delivery at your door' },
      { name: 'Lost Item Recovery', description: 'Coordination to trace and recover lost documents or items' },
      { name: 'Medicine Pickup & Refills', description: 'Prescriptions refilled before they run out, delivered home' },
      { name: 'Passport Photos & Forms', description: 'Photos, forms and application paperwork done right' },
      { name: 'Pet Care', description: 'Walking, grooming and vet visits for your pets' },
      { name: 'Pet Food & Supplies', description: 'Pet food and supplies picked up on schedule' },
      { name: 'Queue Standing', description: 'Someone holds the queue at banks, offices and temples' },
      { name: 'SIM Replacement & Activation', description: 'SIM swaps, new connections and activation help' },
      { name: 'Subscription Renewals', description: 'Renewals and recurring payments tracked and handled' },
    ],
  },
  {
    name: 'Events & Management',
    tasks: [
      { name: 'Catering', description: 'Home cooks and caterers for parties, poojas and daily meals' },
      { name: 'Decor & Vendor Coordination', description: 'Decorators, sound and vendors booked and coordinated' },
      { name: 'Event Day Logistics', description: 'Someone runs the day so you can be with your guests' },
      { name: 'Gift & Return Gifts', description: 'Gifting planned, sourced and managed for guests' },
      { name: 'Guest Travel & Stay', description: 'Travel and accommodation arranged for outstation guests' },
      { name: 'Mehendi', description: 'Mehendi artists for weddings, festivals and occasions' },
      { name: 'Party Hosting', description: 'Emcees, decor and coordination for house parties' },
      { name: 'Photography & Videography', description: 'Photographers and videographers booked for the day' },
      { name: 'Post-Event Cleanup', description: 'Cleanup and settlements handled after the event' },
      { name: 'Reception Setup', description: 'Guest reception, welcome kits and front-desk staffing' },
      { name: 'Venue Shortlisting', description: 'Venues shortlisted, booked and budget tracked' },
      { name: 'Wine Curation', description: 'Sommelier-picked wine and bar setup for your evenings' },
    ],
  },
  {
    name: 'Health & Medical',
    tasks: [
      { name: 'Doctor Appointment Scheduling', description: 'Appointments booked, rescheduled and tracked' },
      { name: 'Health Insurance Claims', description: 'Claim paperwork coordinated with the insurer' },
      { name: 'Home Doctor Visit', description: 'Doctor visits arranged at home when travel is hard' },
      { name: 'Hospital Admission Logistics', description: 'Admission paperwork and coordination handled' },
      { name: 'Lab Test Booking', description: 'Home sample collection and reports delivered' },
      { name: 'Medical Travel Coordination', description: 'Transport and logistics for treatment trips' },
      { name: 'Pharmacy Runs', description: 'Medicines picked up and delivered the same day' },
      { name: 'Physiotherapy', description: 'Certified physiotherapists for home visits and rehab plans' },
      { name: 'Report Pickup & Delivery', description: 'Reports collected and shared with the right doctor' },
      { name: 'Second Opinion Coordination', description: 'Reports arranged and appointments set for second opinions' },
      { name: 'Wellness Check Scheduling', description: 'Preventive health check-ups booked on schedule' },
      { name: 'Yoga Coach', description: 'Personal yoga sessions at home, online or in the park' },
    ],
  },
  {
    name: 'Home Services',
    tasks: [
      { name: 'AC Repair', description: 'Diagnosis, gas refill and repairs for split and window ACs' },
      { name: 'AC Servicing & Installation', description: 'Pre-season servicing, installation and relocation of units' },
      { name: 'Deep Cleaning', description: 'Full-home deep cleaning including kitchen, bathrooms and balconies' },
      { name: 'Electrical & Appliance Repair', description: 'Wiring, switches and appliance fixes by vetted electricians' },
      { name: 'Furniture Assembly', description: 'Flat-pack and new furniture assembled and placed' },
      { name: 'Gas Pipeline Inspection', description: 'Safety checks and repairs for kitchen gas lines' },
      { name: 'Handyman', description: 'Carpentry, plumbing and electrical odd jobs around the house' },
      { name: 'Home Inspection Before Travel', description: 'Property checked and secured before you leave town' },
      { name: 'Painting & Carpentry', description: 'Painting touch-ups and carpentry work done at home' },
      { name: 'Pest Control', description: 'Cockroach, termite and mosquito treatment with child-safe options' },
      { name: 'Plumbing', description: 'Leaks, fittings and bathroom or kitchen plumbing repairs' },
      { name: 'Sofa Cleaning', description: 'Shampoo and vacuum cleaning for sofas, carpets and mattresses' },
      { name: 'Water Purifier Service', description: 'RO/UV purifier repair, filter change and annual maintenance' },
      { name: 'Water Tank & Motor', description: 'Tank cleaning, motor repair and sump maintenance' },
    ],
  },
  {
    name: 'Relocation Services',
    tasks: [
      { name: 'Address Change Updates', description: 'Address updated across banks, IDs and subscriptions' },
      { name: 'City Relocation Planning', description: 'Inter-city moves planned end to end' },
      { name: 'Exit Inspection Handling', description: 'Move-out inspection and deposit discussions handled' },
      { name: 'Furniture Buying & Setup', description: 'Furniture sourced, delivered and set up in the new home' },
      { name: 'House Shifting Coordination', description: 'The whole move sequenced and supervised' },
      { name: 'Local Area Orientation', description: 'New neighbourhood walkthrough: shops, services, society' },
      { name: 'Maid & Helper Onboarding', description: 'Trusted local help found and onboarded at the new home' },
      { name: 'Packers & Movers', description: 'Vetted packers booked with someone accountable on the day' },
      { name: 'PG & House Search', description: 'Options shortlisted and visits coordinated for you' },
      { name: 'School Transfer Support', description: 'Records and paperwork moved between schools' },
      { name: 'Society NOC & Paperwork', description: 'Society NOCs and building formalities at both ends' },
      { name: 'Utility Transfer', description: 'Electricity, water, gas and internet moved to the new address' },
    ],
  },
  {
    name: 'Religious & Cultural',
    tasks: [
      { name: 'Community Event Setup', description: 'Local cultural and community events organised' },
      { name: 'Elder Ritual Assistance', description: 'Help for elders attending or performing rituals' },
      { name: 'Fasting & Vrat Meal Planning', description: 'Fasting-friendly meals planned and arranged' },
      { name: 'Festival Preparation', description: 'Home, decor and arrangements ready before the festival' },
      { name: 'Muhurat & Calendar Planning', description: 'Auspicious dates and times planned with the family' },
      { name: 'Pilgrimage Planning', description: 'Temple trips planned with travel and stay arranged' },
      { name: 'Pooja & Priest Booking', description: 'The right priest booked for your family’s tradition' },
      { name: 'Samagri & Offerings', description: 'Puja items, prasad and offerings sourced and ready' },
      { name: 'Temple Visit Coordination', description: 'Temple visits arranged with darshan timing handled' },
      { name: 'Wedding Rituals Coordination', description: 'Each ceremony arranged in the family’s tradition' },
    ],
  },
  {
    name: 'Senior Care',
    tasks: [
      { name: 'Caregiver Replacement', description: 'A replacement arranged quickly when care stops working' },
      { name: 'Companionship', description: 'Regular company for parents spending the day alone' },
      { name: 'Daily Check-in Visits', description: 'A real person drops in and reports what they saw' },
      { name: 'Diet & Meal Coordination', description: 'Meals planned and cooked to the doctor’s advice' },
      { name: 'Digital Help for Seniors', description: 'Patient help with phones, video calls and apps' },
      { name: 'Doctor Appointment Accompaniment', description: 'Someone goes along, notes the advice and relays it' },
      { name: 'Emergency Response Coordination', description: 'Fast coordination when something urgent happens' },
      { name: 'Home Safety Checks', description: 'Fall risks, gas and electrics checked regularly' },
      { name: 'Hospital Visit Accompaniment', description: 'Transport, waiting and paperwork during hospital visits' },
      { name: 'Lab Tests at Home', description: 'Sample collection at home with reports shared' },
      { name: 'Medicine Management', description: 'Medicines confirmed taken, refills flagged early' },
      { name: 'Mobility & Transport Assistance', description: 'Rides and assistance for appointments and outings' },
    ],
  },
  {
    name: 'Travel & Tourism',
    tasks: [
      { name: 'Airport Drop', description: 'On-time airport pickups and drops with verified drivers' },
      { name: 'Car Rental', description: 'Self-drive and chauffeured cars by the day or week' },
      { name: 'Emergency Travel Changes', description: 'Cancellations and re-planning handled mid-trip' },
      { name: 'Flight Booking & Rebooking', description: 'Flights booked and reworked when plans shift' },
      { name: 'Hotel Booking', description: 'Hotels shortlisted and booked to your budget' },
      { name: 'Itinerary Planning', description: 'Multi-city trips planned and held in one place' },
      { name: 'Language & Local Guide', description: 'Local guides and language support on the ground' },
      { name: 'Luggage Handling & Storage', description: 'Luggage stored or moved between stays' },
      { name: 'Passport Assistance', description: 'Application, appointment and documentation help for passports' },
      { name: 'Permits & Entry Passes', description: 'Permits and entry passes arranged before travel' },
      { name: 'Train Booking', description: 'Tatkal and waitlisted train tickets handled' },
      { name: 'Travel Insurance', description: 'The right cover arranged for the trip' },
      { name: 'Travel SIM & Connectivity', description: 'SIMs and data set up before you land' },
      { name: 'Vehicle RC Transfer', description: 'RC transfer, hypothecation removal and RTO paperwork' },
      { name: 'Visa Document Preparation', description: 'Documents assembled and appointments coordinated' },
    ],
  },
  {
    name: 'Workforce Management',
    tasks: [
      { name: 'Attendance & Payroll', description: 'Attendance tracked and salary cycles run properly' },
      { name: 'Conflict Resolution Support', description: 'Issues with staff handled before they escalate' },
      { name: 'Cook Hiring', description: 'Verified cooks sourced and interviewed for your kitchen' },
      { name: 'Cook Scheduling & Backup', description: 'Schedules managed with backup when the cook is away' },
      { name: 'Driver Hiring', description: 'Background-verified drivers sourced and checked' },
      { name: 'Exit & Transition Support', description: 'Notice, handover and settlement handled cleanly' },
      { name: 'Maid Hiring', description: 'Verified maids sourced with replacement guarantee' },
      { name: 'Nanny Sourcing', description: 'Vetted nannies for children, with references checked' },
      { name: 'Police Verification', description: 'Identity and police verification arranged before joining' },
      { name: 'Staff Document Management', description: 'IDs, contracts and records kept in order' },
      { name: 'Temporary Staff', description: 'Short-term help arranged for busy weeks or events' },
      { name: 'Training & Instruction', description: 'Household routines and instructions passed on clearly' },
    ],
  },
];
