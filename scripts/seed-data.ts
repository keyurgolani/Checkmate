#!/usr/bin/env npx tsx
/**
 * Seed Data Script for CheckMate
 * 
 * Creates comprehensive test data for manual QA testing including:
 * - Multiple users with different roles
 * - Workspaces with various configurations
 * - Templates (blueprints) with different visibility levels
 * - Conditional templates with questions
 * - Nested template references
 * - Checklists (instances) with varying progress
 * - Collaborations with different permission levels
 * - Notifications of various types
 * - Enough data to test scrolling (overflow viewport)
 * 
 * Usage:
 *   npx tsx scripts/seed-data.ts
 * 
 * Environment Variables:
 *   POCKETBASE_URL - PocketBase server URL (default: http://127.0.0.1:8090)
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const DEFAULT_PASSWORD = 'TestPassword123!';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@checkmate.dev';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'password123456';

// Disable auto-cancellation for multiple requests
const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

// Admin client for operations that need elevated privileges
const adminPb = new PocketBase(POCKETBASE_URL);
adminPb.autoCancellation(false);
let adminAuthenticated = false;

// ============================================================================
// Types
// ============================================================================

interface CreatedUser {
  id: string;
  email: string;
  displayName: string;
}

interface CreatedWorkspace {
  id: string;
  name: string;
  owner: string;
}

interface CreatedTemplate {
  id: string;
  title: string;
  owner: string;
  workspace: string;
  visibility: string;
}

interface CreatedItem {
  id: string;
  content: string;
  blueprint: string;
  path: string;
  position: number;
}

// ============================================================================
// Seed Data Definitions
// ============================================================================

const USERS = [
  { email: 'alice@checkmate.test', displayName: 'Alice Johnson', role: 'primary' },
  { email: 'bob@checkmate.test', displayName: 'Bob Smith', role: 'collaborator' },
  { email: 'carol@checkmate.test', displayName: 'Carol Williams', role: 'collaborator' },
  { email: 'david@checkmate.test', displayName: 'David Brown', role: 'viewer' },
  { email: 'emma@checkmate.test', displayName: 'Emma Davis', role: 'public' },
];

const CATEGORIES = [
  'Travel', 'Home', 'Work', 'Health', 'Finance', 'Education', 
  'Events', 'Projects', 'Personal', 'Technology'
];

const WORKSPACE_TEMPLATES = [
  { name: 'Personal Projects', description: 'My personal checklists and templates' },
  { name: 'Work Tasks', description: 'Professional and work-related checklists' },
  { name: 'Home Management', description: 'Household tasks and maintenance' },
  { name: 'Travel Planning', description: 'Trip planning and packing lists' },
];

// Comprehensive template definitions with realistic content
const TEMPLATE_DEFINITIONS = [
  // ========== TRAVEL TEMPLATES ==========
  {
    title: 'International Trip Packing List',
    description: 'Complete packing checklist for international travel with clothing, documents, electronics, and toiletries.',
    category: 'Travel',
    tags: ['travel', 'packing', 'international', 'vacation'],
    visibility: 'public',
    items: [
      { content: 'Documents & Money', children: [
        { content: 'Passport (check expiry date - 6 months validity)' },
        { content: 'Visa documents if required' },
        { content: 'Travel insurance documents' },
        { content: 'Flight tickets / boarding passes' },
        { content: 'Hotel reservations' },
        { content: 'Credit cards (notify bank of travel)' },
        { content: 'Local currency / travel card' },
        { content: 'Emergency contact list' },
        { content: 'Copies of important documents (digital + physical)' },
      ]},
      { content: 'Clothing', children: [
        { content: 'Underwear (days + 2 extra)' },
        { content: 'Socks (days + 2 extra)' },
        { content: 'T-shirts / tops' },
        { content: 'Pants / shorts' },
        { content: 'Sleepwear' },
        { content: 'Jacket / sweater' },
        { content: 'Formal outfit (if needed)' },
        { content: 'Swimwear' },
        { content: 'Comfortable walking shoes' },
        { content: 'Sandals / flip flops' },
        { content: 'Belt' },
        { content: 'Hat / cap' },
        { content: 'Sunglasses' },
      ]},
      { content: 'Electronics', children: [
        { content: 'Phone + charger' },
        { content: 'Laptop / tablet + charger' },
        { content: 'Universal power adapter' },
        { content: 'Portable battery pack' },
        { content: 'Headphones / earbuds' },
        { content: 'Camera + memory cards' },
        { content: 'E-reader' },
      ]},
      { content: 'Toiletries (travel size)', children: [
        { content: 'Toothbrush + toothpaste' },
        { content: 'Shampoo + conditioner' },
        { content: 'Body wash / soap' },
        { content: 'Deodorant' },
        { content: 'Razor + shaving cream' },
        { content: 'Skincare products' },
        { content: 'Sunscreen' },
        { content: 'Medications (prescription + OTC)' },
        { content: 'First aid kit basics' },
      ]},
      { content: 'Miscellaneous', children: [
        { content: 'Luggage locks' },
        { content: 'Neck pillow' },
        { content: 'Eye mask + earplugs' },
        { content: 'Reusable water bottle' },
        { content: 'Snacks for journey' },
        { content: 'Books / entertainment' },
        { content: 'Umbrella' },
        { content: 'Laundry bag' },
      ]},
    ],
  },

  // ========== HOME TEMPLATES ==========
  {
    title: 'Weekly House Cleaning',
    description: 'Comprehensive weekly cleaning routine for a tidy home.',
    category: 'Home',
    tags: ['cleaning', 'home', 'weekly', 'routine'],
    visibility: 'public',
    items: [
      { content: 'Kitchen', children: [
        { content: 'Wipe down countertops and stovetop' },
        { content: 'Clean sink and faucet' },
        { content: 'Wipe cabinet fronts' },
        { content: 'Clean microwave inside and out' },
        { content: 'Empty and clean trash can' },
        { content: 'Sweep and mop floor' },
        { content: 'Clean refrigerator shelves (monthly)' },
      ]},
      { content: 'Bathrooms', children: [
        { content: 'Scrub toilet bowl and wipe exterior' },
        { content: 'Clean sink and countertop' },
        { content: 'Wipe mirror' },
        { content: 'Clean shower/tub' },
        { content: 'Replace towels' },
        { content: 'Empty trash' },
        { content: 'Mop floor' },
      ]},
      { content: 'Bedrooms', children: [
        { content: 'Change bed linens' },
        { content: 'Dust surfaces and furniture' },
        { content: 'Vacuum or sweep floor' },
        { content: 'Organize nightstands' },
        { content: 'Empty trash' },
      ]},
      { content: 'Living Areas', children: [
        { content: 'Dust all surfaces' },
        { content: 'Vacuum carpets/rugs' },
        { content: 'Sweep/mop hard floors' },
        { content: 'Fluff and arrange pillows' },
        { content: 'Wipe TV screen and electronics' },
        { content: 'Clean windows (monthly)' },
      ]},
      { content: 'General Tasks', children: [
        { content: 'Take out all trash and recycling' },
        { content: 'Do laundry' },
        { content: 'Water plants' },
        { content: 'Check and replace air filters (monthly)' },
      ]},
    ],
  },
  {
    title: 'Moving to New Home Checklist',
    description: 'Complete checklist for relocating to a new home - before, during, and after the move.',
    category: 'Home',
    tags: ['moving', 'relocation', 'home', 'organization'],
    visibility: 'public',
    items: [
      { content: '8 Weeks Before Move', children: [
        { content: 'Create moving budget' },
        { content: 'Research and get quotes from moving companies' },
        { content: 'Start decluttering - donate/sell unwanted items' },
        { content: 'Begin collecting packing supplies' },
        { content: 'Notify landlord if renting' },
      ]},
      { content: '6 Weeks Before Move', children: [
        { content: 'Book moving company or reserve truck' },
        { content: 'Start packing non-essential items' },
        { content: 'Arrange school transfers if applicable' },
        { content: 'Notify employer of address change' },
        { content: 'Begin using up frozen food' },
      ]},
      { content: '4 Weeks Before Move', children: [
        { content: 'Notify utilities (electric, gas, water, internet)' },
        { content: 'Update address with post office' },
        { content: 'Update address with bank and credit cards' },
        { content: 'Transfer medical records' },
        { content: 'Arrange pet transport if needed' },
      ]},
      { content: '2 Weeks Before Move', children: [
        { content: 'Confirm moving company details' },
        { content: 'Pack most belongings, label boxes clearly' },
        { content: 'Arrange cleaning of old home' },
        { content: 'Prepare essentials box (first night items)' },
        { content: 'Notify friends and family of new address' },
      ]},
      { content: 'Moving Day', children: [
        { content: 'Do final walkthrough of old home' },
        { content: 'Take meter readings' },
        { content: 'Supervise loading of truck' },
        { content: 'Keep valuables and documents with you' },
        { content: 'Hand over keys to old property' },
      ]},
      { content: 'After the Move', children: [
        { content: 'Check all utilities are working' },
        { content: 'Unpack essentials first' },
        { content: 'Update drivers license address' },
        { content: 'Register to vote at new address' },
        { content: 'Meet neighbors' },
        { content: 'Locate nearest hospital and emergency services' },
      ]},
    ],
  },

  // ========== WORK/PROJECT TEMPLATES ==========
  {
    title: 'Software Project Launch Checklist',
    description: 'Comprehensive checklist for launching a software product or major feature.',
    category: 'Work',
    tags: ['software', 'launch', 'deployment', 'project'],
    visibility: 'shared',
    items: [
      { content: 'Pre-Launch Preparation', children: [
        { content: 'Complete all planned features' },
        { content: 'Code review completed for all changes' },
        { content: 'All unit tests passing' },
        { content: 'Integration tests passing' },
        { content: 'Performance testing completed' },
        { content: 'Security audit completed' },
        { content: 'Documentation updated' },
        { content: 'Release notes prepared' },
      ]},
      { content: 'Infrastructure', children: [
        { content: 'Production environment configured' },
        { content: 'Database migrations tested' },
        { content: 'Backup systems verified' },
        { content: 'Monitoring and alerting configured' },
        { content: 'SSL certificates valid' },
        { content: 'CDN configured (if applicable)' },
        { content: 'Load balancer configured' },
      ]},
      { content: 'Deployment', children: [
        { content: 'Create deployment checklist' },
        { content: 'Schedule deployment window' },
        { content: 'Notify stakeholders of deployment' },
        { content: 'Prepare rollback plan' },
        { content: 'Deploy to staging for final verification' },
        { content: 'Deploy to production' },
        { content: 'Verify deployment successful' },
        { content: 'Run smoke tests' },
      ]},
      { content: 'Post-Launch', children: [
        { content: 'Monitor error rates' },
        { content: 'Monitor performance metrics' },
        { content: 'Check user feedback channels' },
        { content: 'Send launch announcement' },
        { content: 'Update status page' },
        { content: 'Schedule post-mortem meeting' },
      ]},
    ],
  },
  {
    title: 'New Employee Onboarding',
    description: 'HR checklist for onboarding new team members.',
    category: 'Work',
    tags: ['hr', 'onboarding', 'employee', 'hiring'],
    visibility: 'private',
    items: [
      { content: 'Before First Day', children: [
        { content: 'Send welcome email with first day details' },
        { content: 'Prepare workstation and equipment' },
        { content: 'Create email and system accounts' },
        { content: 'Add to relevant Slack/Teams channels' },
        { content: 'Schedule orientation meetings' },
        { content: 'Assign onboarding buddy' },
        { content: 'Prepare welcome kit' },
      ]},
      { content: 'First Day', children: [
        { content: 'Office tour and introductions' },
        { content: 'Review company policies and handbook' },
        { content: 'Complete HR paperwork' },
        { content: 'Set up computer and accounts' },
        { content: 'Lunch with team' },
        { content: 'Review role expectations' },
      ]},
      { content: 'First Week', children: [
        { content: 'Complete required training modules' },
        { content: 'Meet with key stakeholders' },
        { content: 'Review current projects' },
        { content: 'Set up development environment (if technical)' },
        { content: 'First 1:1 with manager' },
        { content: 'Review 30-60-90 day plan' },
      ]},
      { content: 'First Month', children: [
        { content: 'Complete all compliance training' },
        { content: 'Contribute to first project' },
        { content: 'Weekly check-ins with manager' },
        { content: 'Gather feedback on onboarding experience' },
        { content: '30-day review meeting' },
      ]},
    ],
  },

  // ========== CONDITIONAL TEMPLATE (with questions) ==========
  {
    title: 'Wedding Planning Checklist',
    description: 'Comprehensive wedding planning checklist that adapts based on your wedding style and preferences.',
    category: 'Events',
    tags: ['wedding', 'planning', 'events', 'celebration'],
    visibility: 'public',
    questions: [
      { id: 'outdoor', question: 'Is this an outdoor wedding?', answerType: 'boolean', defaultValue: false },
      { id: 'destination', question: 'Is this a destination wedding?', answerType: 'boolean', defaultValue: false },
      { id: 'size', question: 'What is the wedding size?', answerType: 'enum', enumOptions: ['intimate', 'medium', 'large'], defaultValue: 'medium' },
      { id: 'diy', question: 'Are you doing DIY decorations?', answerType: 'boolean', defaultValue: false },
    ],
    items: [
      { content: '12+ Months Before', children: [
        { content: 'Set wedding budget' },
        { content: 'Choose wedding date' },
        { content: 'Book venue', conditions: [{ questionId: 'destination', operator: 'equals', value: false }] },
        { content: 'Research destination venues and travel requirements', conditions: [{ questionId: 'destination', operator: 'equals', value: true }] },
        { content: 'Start guest list' },
        { content: 'Hire wedding planner (optional)' },
        { content: 'Book photographer and videographer' },
      ]},
      { content: '9-11 Months Before', children: [
        { content: 'Book caterer' },
        { content: 'Book band or DJ' },
        { content: 'Shop for wedding dress/attire' },
        { content: 'Choose wedding party' },
        { content: 'Book officiant' },
        { content: 'Reserve hotel room blocks', conditions: [{ questionId: 'destination', operator: 'equals', value: true }] },
        { content: 'Research tent and outdoor equipment rentals', conditions: [{ questionId: 'outdoor', operator: 'equals', value: true }] },
      ]},
      { content: '6-8 Months Before', children: [
        { content: 'Send save-the-dates' },
        { content: 'Book florist' },
        { content: 'Order wedding cake' },
        { content: 'Plan honeymoon' },
        { content: 'Register for gifts' },
        { content: 'Book hair and makeup artists' },
        { content: 'Start DIY decoration projects', conditions: [{ questionId: 'diy', operator: 'equals', value: true }] },
        { content: 'Arrange guest transportation', conditions: [{ questionId: 'size', operator: 'equals', value: 'large' }] },
      ]},
      { content: '3-5 Months Before', children: [
        { content: 'Send invitations' },
        { content: 'Finalize menu' },
        { content: 'Order wedding rings' },
        { content: 'Plan rehearsal dinner' },
        { content: 'Arrange rentals (chairs, tables, linens)' },
        { content: 'Book weather backup plan', conditions: [{ questionId: 'outdoor', operator: 'equals', value: true }] },
        { content: 'Finalize DIY projects', conditions: [{ questionId: 'diy', operator: 'equals', value: true }] },
      ]},
      { content: '1-2 Months Before', children: [
        { content: 'Final dress fitting' },
        { content: 'Confirm all vendors' },
        { content: 'Get marriage license' },
        { content: 'Create seating chart' },
        { content: 'Write vows' },
        { content: 'Final guest count to caterer' },
        { content: 'Prepare wedding day timeline' },
      ]},
      { content: 'Week of Wedding', children: [
        { content: 'Confirm final details with all vendors' },
        { content: 'Rehearsal and rehearsal dinner' },
        { content: 'Prepare tips and payments for vendors' },
        { content: 'Pack for honeymoon' },
        { content: 'Delegate day-of responsibilities' },
        { content: 'Relax and enjoy!' },
      ]},
    ],
  },

  // ========== MORE CONDITIONAL TEMPLATES ==========
  {
    title: 'Home Buying Checklist',
    description: 'Step-by-step guide to purchasing a home, customized for first-time buyers and different financing options.',
    category: 'Finance',
    tags: ['home', 'buying', 'real-estate', 'finance'],
    visibility: 'public',
    questions: [
      { id: 'firstTime', question: 'Are you a first-time home buyer?', answerType: 'boolean', defaultValue: true },
      { id: 'financing', question: 'What type of financing?', answerType: 'enum', enumOptions: ['conventional', 'fha', 'va', 'cash'], defaultValue: 'conventional' },
      { id: 'newConstruction', question: 'Are you buying new construction?', answerType: 'boolean', defaultValue: false },
    ],
    items: [
      { content: 'Financial Preparation', children: [
        { content: 'Check credit score and report' },
        { content: 'Calculate how much house you can afford' },
        { content: 'Save for down payment (typically 3-20%)' },
        { content: 'Research first-time buyer programs and grants', conditions: [{ questionId: 'firstTime', operator: 'equals', value: true }] },
        { content: 'Obtain VA Certificate of Eligibility', conditions: [{ questionId: 'financing', operator: 'equals', value: 'va' }] },
        { content: 'Get pre-approved for mortgage', conditions: [{ questionId: 'financing', operator: 'notEquals', value: 'cash' }] },
        { content: 'Prepare proof of funds letter', conditions: [{ questionId: 'financing', operator: 'equals', value: 'cash' }] },
      ]},
      { content: 'House Hunting', children: [
        { content: 'Define must-haves vs nice-to-haves' },
        { content: 'Research neighborhoods' },
        { content: 'Hire a real estate agent' },
        { content: 'Attend open houses and showings' },
        { content: 'Research builder reputation and warranty', conditions: [{ questionId: 'newConstruction', operator: 'equals', value: true }] },
        { content: 'Review HOA rules if applicable' },
      ]},
      { content: 'Making an Offer', children: [
        { content: 'Research comparable sales' },
        { content: 'Submit offer with earnest money' },
        { content: 'Negotiate terms' },
        { content: 'Sign purchase agreement' },
        { content: 'Review builder contract carefully', conditions: [{ questionId: 'newConstruction', operator: 'equals', value: true }] },
      ]},
      { content: 'Due Diligence', children: [
        { content: 'Schedule home inspection' },
        { content: 'Review inspection report and negotiate repairs' },
        { content: 'Get appraisal', conditions: [{ questionId: 'financing', operator: 'notEquals', value: 'cash' }] },
        { content: 'Review title search' },
        { content: 'Get homeowners insurance quotes' },
        { content: 'Schedule construction inspections at key phases', conditions: [{ questionId: 'newConstruction', operator: 'equals', value: true }] },
      ]},
      { content: 'Closing', children: [
        { content: 'Review closing disclosure' },
        { content: 'Do final walkthrough' },
        { content: 'Wire closing funds' },
        { content: 'Sign closing documents' },
        { content: 'Receive keys!' },
        { content: 'Attend new home orientation', conditions: [{ questionId: 'newConstruction', operator: 'equals', value: true }] },
      ]},
    ],
  },

  // ========== HEALTH TEMPLATES ==========
  {
    title: 'Annual Health Checkup Preparation',
    description: 'Prepare for your annual physical examination.',
    category: 'Health',
    tags: ['health', 'medical', 'checkup', 'wellness'],
    visibility: 'public',
    items: [
      { content: 'Before Appointment', children: [
        { content: 'List current medications and dosages' },
        { content: 'Note any new symptoms or concerns' },
        { content: 'Gather family medical history updates' },
        { content: 'List questions for doctor' },
        { content: 'Fast if required for blood work' },
        { content: 'Bring insurance card and ID' },
      ]},
      { content: 'During Appointment', children: [
        { content: 'Discuss any new symptoms' },
        { content: 'Review medications' },
        { content: 'Ask about recommended screenings' },
        { content: 'Discuss lifestyle factors (diet, exercise, sleep)' },
        { content: 'Get referrals if needed' },
      ]},
      { content: 'After Appointment', children: [
        { content: 'Schedule follow-up tests if ordered' },
        { content: 'Fill any new prescriptions' },
        { content: 'Schedule specialist appointments if referred' },
        { content: 'Review and file test results' },
        { content: 'Schedule next annual checkup' },
      ]},
    ],
  },
  {
    title: 'Emergency Preparedness Kit',
    description: '72-hour emergency supply kit checklist for natural disasters.',
    category: 'Home',
    tags: ['emergency', 'preparedness', 'safety', 'disaster'],
    visibility: 'public',
    items: [
      { content: 'Water & Food', children: [
        { content: 'Water - 1 gallon per person per day (3-day supply)' },
        { content: 'Non-perishable food (3-day supply)' },
        { content: 'Manual can opener' },
        { content: 'Eating utensils' },
        { content: 'Water purification tablets' },
      ]},
      { content: 'First Aid & Medical', children: [
        { content: 'First aid kit' },
        { content: 'Prescription medications (7-day supply)' },
        { content: 'Over-the-counter medications' },
        { content: 'First aid manual' },
        { content: 'Medical equipment (glasses, hearing aids, etc.)' },
      ]},
      { content: 'Tools & Safety', children: [
        { content: 'Flashlight with extra batteries' },
        { content: 'Battery-powered or hand-crank radio' },
        { content: 'Multi-tool or knife' },
        { content: 'Whistle (to signal for help)' },
        { content: 'Dust masks' },
        { content: 'Plastic sheeting and duct tape' },
        { content: 'Wrench or pliers (to turn off utilities)' },
        { content: 'Fire extinguisher' },
      ]},
      { content: 'Personal Items', children: [
        { content: 'Change of clothes per person' },
        { content: 'Sturdy shoes' },
        { content: 'Blankets or sleeping bags' },
        { content: 'Personal hygiene items' },
        { content: 'Important documents in waterproof container' },
        { content: 'Cash in small bills' },
        { content: 'Phone charger / portable battery' },
      ]},
      { content: 'Special Needs', children: [
        { content: 'Baby supplies (formula, diapers, bottles)' },
        { content: 'Pet food and supplies' },
        { content: 'Games and activities for children' },
        { content: 'Comfort items' },
      ]},
    ],
  },

  // ========== EDUCATION/PERSONAL TEMPLATES ==========
  {
    title: 'College Application Checklist',
    description: 'Complete guide for applying to colleges and universities.',
    category: 'Education',
    tags: ['college', 'application', 'education', 'student'],
    visibility: 'public',
    items: [
      { content: 'Junior Year', children: [
        { content: 'Research colleges and create initial list' },
        { content: 'Take PSAT/NMSQT' },
        { content: 'Start SAT/ACT preparation' },
        { content: 'Maintain strong GPA' },
        { content: 'Participate in extracurricular activities' },
        { content: 'Visit colleges if possible' },
        { content: 'Build relationships with teachers for recommendations' },
      ]},
      { content: 'Summer Before Senior Year', children: [
        { content: 'Finalize college list (reach, match, safety)' },
        { content: 'Take/retake SAT or ACT' },
        { content: 'Start working on personal essay' },
        { content: 'Request letters of recommendation' },
        { content: 'Create Common App account' },
        { content: 'Research scholarships' },
      ]},
      { content: 'Fall of Senior Year', children: [
        { content: 'Complete and submit early applications' },
        { content: 'Send SAT/ACT scores to colleges' },
        { content: 'Request transcripts from school' },
        { content: 'Complete FAFSA (opens October 1)' },
        { content: 'Complete CSS Profile if required' },
        { content: 'Apply for scholarships' },
        { content: 'Complete regular decision applications' },
      ]},
      { content: 'Spring of Senior Year', children: [
        { content: 'Review admission decisions' },
        { content: 'Compare financial aid packages' },
        { content: 'Visit admitted student events' },
        { content: 'Make final decision by May 1' },
        { content: 'Submit enrollment deposit' },
        { content: 'Send final transcript' },
        { content: 'Complete housing application' },
        { content: 'Register for orientation' },
      ]},
    ],
  },
  {
    title: 'Daily Morning Routine',
    description: 'Productive morning routine template for a great start to the day.',
    category: 'Personal',
    tags: ['routine', 'morning', 'productivity', 'habits'],
    visibility: 'public',
    items: [
      { content: 'Wake Up (6:00 AM)', children: [
        { content: 'No snooze - get up immediately' },
        { content: 'Make bed' },
        { content: 'Drink glass of water' },
        { content: 'Open blinds / get natural light' },
      ]},
      { content: 'Movement (6:15 AM)', children: [
        { content: 'Stretch for 5 minutes' },
        { content: 'Exercise (20-30 minutes)' },
        { content: 'Cool down and hydrate' },
      ]},
      { content: 'Hygiene (6:45 AM)', children: [
        { content: 'Shower' },
        { content: 'Skincare routine' },
        { content: 'Brush teeth' },
        { content: 'Get dressed' },
      ]},
      { content: 'Nourishment (7:15 AM)', children: [
        { content: 'Prepare healthy breakfast' },
        { content: 'Take vitamins/supplements' },
        { content: 'Enjoy breakfast mindfully (no phone)' },
      ]},
      { content: 'Mindset (7:45 AM)', children: [
        { content: 'Review calendar and priorities' },
        { content: 'Journal or gratitude practice (5 min)' },
        { content: 'Set 3 main goals for the day' },
      ]},
      { content: 'Prepare to Leave (8:00 AM)', children: [
        { content: 'Pack bag with essentials' },
        { content: 'Check weather and dress appropriately' },
        { content: 'Final mirror check' },
        { content: 'Leave on time' },
      ]},
    ],
  },

  // ========== TECHNOLOGY TEMPLATES ==========
  {
    title: 'Website Launch Checklist',
    description: 'Pre-launch checklist for websites covering SEO, performance, security, and accessibility.',
    category: 'Technology',
    tags: ['website', 'launch', 'seo', 'web-development'],
    visibility: 'public',
    items: [
      { content: 'Content & Copy', children: [
        { content: 'Proofread all text content' },
        { content: 'Check all links work correctly' },
        { content: 'Verify contact information is correct' },
        { content: 'Add privacy policy and terms of service' },
        { content: 'Create 404 error page' },
        { content: 'Add favicon' },
      ]},
      { content: 'SEO', children: [
        { content: 'Add unique title tags to all pages' },
        { content: 'Add meta descriptions to all pages' },
        { content: 'Implement proper heading hierarchy (H1, H2, etc.)' },
        { content: 'Add alt text to all images' },
        { content: 'Create and submit sitemap.xml' },
        { content: 'Create robots.txt' },
        { content: 'Set up Google Search Console' },
        { content: 'Implement structured data / schema markup' },
      ]},
      { content: 'Performance', children: [
        { content: 'Optimize and compress images' },
        { content: 'Minify CSS and JavaScript' },
        { content: 'Enable browser caching' },
        { content: 'Enable GZIP compression' },
        { content: 'Test page load speed (aim for < 3 seconds)' },
        { content: 'Implement lazy loading for images' },
        { content: 'Test on slow connections' },
      ]},
      { content: 'Security', children: [
        { content: 'Install and configure SSL certificate' },
        { content: 'Force HTTPS redirect' },
        { content: 'Set up security headers' },
        { content: 'Implement CAPTCHA on forms' },
        { content: 'Set up regular backups' },
        { content: 'Update all plugins/dependencies' },
      ]},
      { content: 'Accessibility', children: [
        { content: 'Test with screen reader' },
        { content: 'Ensure keyboard navigation works' },
        { content: 'Check color contrast ratios' },
        { content: 'Add skip navigation link' },
        { content: 'Ensure forms have proper labels' },
        { content: 'Test at 200% zoom' },
      ]},
      { content: 'Cross-Browser Testing', children: [
        { content: 'Test in Chrome' },
        { content: 'Test in Firefox' },
        { content: 'Test in Safari' },
        { content: 'Test in Edge' },
        { content: 'Test on mobile devices' },
        { content: 'Test on tablets' },
      ]},
      { content: 'Analytics & Tracking', children: [
        { content: 'Set up Google Analytics' },
        { content: 'Configure goal tracking' },
        { content: 'Set up event tracking' },
        { content: 'Test analytics is recording data' },
      ]},
    ],
  },
  {
    title: 'Code Review Checklist',
    description: 'Systematic checklist for reviewing code changes.',
    category: 'Technology',
    tags: ['code-review', 'development', 'quality', 'programming'],
    visibility: 'shared',
    items: [
      { content: 'Functionality', children: [
        { content: 'Code accomplishes the stated purpose' },
        { content: 'Edge cases are handled' },
        { content: 'Error handling is appropriate' },
        { content: 'No obvious bugs or logic errors' },
      ]},
      { content: 'Code Quality', children: [
        { content: 'Code is readable and self-documenting' },
        { content: 'Functions/methods are appropriately sized' },
        { content: 'No code duplication (DRY principle)' },
        { content: 'Naming conventions are followed' },
        { content: 'Comments explain "why" not "what"' },
      ]},
      { content: 'Testing', children: [
        { content: 'Unit tests are included' },
        { content: 'Tests cover happy path and edge cases' },
        { content: 'All tests pass' },
        { content: 'Test coverage is adequate' },
      ]},
      { content: 'Security', children: [
        { content: 'No hardcoded secrets or credentials' },
        { content: 'Input validation is present' },
        { content: 'SQL injection prevention' },
        { content: 'XSS prevention' },
        { content: 'Authentication/authorization checks' },
      ]},
      { content: 'Performance', children: [
        { content: 'No obvious performance issues' },
        { content: 'Database queries are optimized' },
        { content: 'No N+1 query problems' },
        { content: 'Appropriate caching used' },
      ]},
      { content: 'Documentation', children: [
        { content: 'README updated if needed' },
        { content: 'API documentation updated' },
        { content: 'Changelog entry added' },
      ]},
    ],
  },
];


// ============================================================================
// Helper Functions
// ============================================================================

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  return date.toISOString();
}

function generatePath(position: number, parentPath?: string): string {
  return parentPath ? `${parentPath}.${position}` : String(position);
}

// ============================================================================
// Seeding Functions
// ============================================================================

async function createUsers(): Promise<CreatedUser[]> {
  console.log('\n📝 Creating users...');
  const createdUsers: CreatedUser[] = [];

  for (const userData of USERS) {
    try {
      // Check if user already exists
      const existing = await pb.collection('users').getList(1, 1, {
        filter: `email = "${userData.email}"`,
      });

      if (existing.items.length > 0) {
        console.log(`   ⏭️  User ${userData.email} already exists`);
        createdUsers.push({
          id: existing.items[0]!.id,
          email: userData.email,
          displayName: userData.displayName,
        });
        continue;
      }

      const user = await pb.collection('users').create({
        email: userData.email,
        password: DEFAULT_PASSWORD,
        passwordConfirm: DEFAULT_PASSWORD,
        displayName: userData.displayName,
        emailVisibility: true,
      });

      createdUsers.push({
        id: user.id,
        email: userData.email,
        displayName: userData.displayName,
      });
      console.log(`   ✅ Created user: ${userData.displayName} (${userData.email})`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.log(`   ⚠️  Failed to create ${userData.email}: ${err.message}`);
    }
  }

  return createdUsers;
}

async function createWorkspaces(users: CreatedUser[]): Promise<CreatedWorkspace[]> {
  console.log('\n📝 Creating workspaces...');
  const createdWorkspaces: CreatedWorkspace[] = [];
  const primaryUser = users[0]!;

  // Authenticate as primary user
  await pb.collection('users').authWithPassword(primaryUser.email, DEFAULT_PASSWORD);

  for (const wsData of WORKSPACE_TEMPLATES) {
    try {
      const workspace = await pb.collection('workspaces').create({
        owner: primaryUser.id,
        name: wsData.name,
        description: wsData.description,
        isArchived: false,
      });

      createdWorkspaces.push({
        id: workspace.id,
        name: wsData.name,
        owner: primaryUser.id,
      });
      console.log(`   ✅ Created workspace: ${wsData.name}`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.log(`   ⚠️  Failed to create workspace ${wsData.name}: ${err.message}`);
    }
  }

  return createdWorkspaces;
}


interface TemplateItem {
  content: string;
  children?: TemplateItem[];
  conditions?: Array<{ questionId: string; operator: string; value: boolean | string }>;
}

interface TemplateDefinition {
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: string;
  questions?: Array<{
    id: string;
    question: string;
    answerType: string;
    enumOptions?: string[];
    defaultValue?: boolean | string;
  }>;
  items: TemplateItem[];
}

async function createTemplateItems(
  blueprintId: string,
  items: TemplateItem[],
  parentId: string | null = null,
  parentPath: string = ''
): Promise<CreatedItem[]> {
  const createdItems: CreatedItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const position = i + 1; // 1-based to avoid PocketBase treating 0 as blank
    const path = generatePath(position, parentPath || undefined);

    try {
      const metadata = item.conditions ? { conditions: item.conditions } : null;
      
      const created = await pb.collection('items').create({
        blueprint: blueprintId,
        parent: parentId,
        path: path,
        itemType: 'task',
        content: item.content,
        position: position,
        metadata: metadata,
      });

      createdItems.push({
        id: created.id,
        content: item.content,
        blueprint: blueprintId,
        path: path,
        position: position,
      });

      // Recursively create children
      if (item.children && item.children.length > 0) {
        const childItems = await createTemplateItems(blueprintId, item.children, created.id, path);
        createdItems.push(...childItems);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.log(`      ⚠️  Failed to create item "${item.content}": ${err.message}`);
    }
  }

  return createdItems;
}

async function createTemplates(
  users: CreatedUser[],
  workspaces: CreatedWorkspace[]
): Promise<CreatedTemplate[]> {
  console.log('\n📝 Creating templates...');
  const createdTemplates: CreatedTemplate[] = [];
  const primaryUser = users[0]!;

  // Ensure authenticated as primary user
  await pb.collection('users').authWithPassword(primaryUser.email, DEFAULT_PASSWORD);

  for (const templateDef of TEMPLATE_DEFINITIONS as TemplateDefinition[]) {
    try {
      // Pick a workspace based on category
      let workspace = workspaces[0]!;
      if (templateDef.category === 'Work' || templateDef.category === 'Technology') {
        workspace = workspaces.find(w => w.name === 'Work Tasks') || workspaces[0]!;
      } else if (templateDef.category === 'Home') {
        workspace = workspaces.find(w => w.name === 'Home Management') || workspaces[0]!;
      } else if (templateDef.category === 'Travel') {
        workspace = workspaces.find(w => w.name === 'Travel Planning') || workspaces[0]!;
      }

      const template = await pb.collection('blueprints').create({
        workspace: workspace.id,
        owner: primaryUser.id,
        title: templateDef.title,
        description: templateDef.description,
        visibility: templateDef.visibility,
        category: templateDef.category,
        tags: templateDef.tags,
        version: 1,
        instanceCount: randomInt(5, 150),
        ratingSum: randomInt(20, 500),
        ratingCount: randomInt(5, 100),
        questions: templateDef.questions || null,
      });

      createdTemplates.push({
        id: template.id,
        title: templateDef.title,
        owner: primaryUser.id,
        workspace: workspace.id,
        visibility: templateDef.visibility,
      });

      console.log(`   ✅ Created template: ${templateDef.title}`);

      // Create items for this template
      const items = await createTemplateItems(template.id, templateDef.items);
      console.log(`      📋 Created ${items.length} items`);

    } catch (error: unknown) {
      const err = error as { message?: string };
      console.log(`   ⚠️  Failed to create template ${templateDef.title}: ${err.message}`);
    }
  }

  return createdTemplates;
}


async function createCollaborations(
  users: CreatedUser[],
  templates: CreatedTemplate[]
): Promise<void> {
  console.log('\n📝 Creating collaborations...');
  const collaborators = users.slice(1);

  // Use admin client for creating collaborators (bypasses access rules)
  if (!adminAuthenticated) {
    try {
      await adminPb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
      adminAuthenticated = true;
    } catch {
      console.log('   ⚠️  Admin auth failed, skipping collaborations');
      return;
    }
  }

  // Find shared templates
  const sharedTemplates = templates.filter(t => t.visibility === 'shared');

  for (const template of sharedTemplates) {
    // Add 1-3 collaborators to each shared template
    const numCollaborators = randomInt(1, Math.min(3, collaborators.length));
    const selectedCollaborators = collaborators.slice(0, numCollaborators);

    for (const collab of selectedCollaborators) {
      try {
        const permissionLevels = ['viewer', 'editor', 'admin'];
        const permission = randomElement(permissionLevels);
        const invitedAt = randomDate(30);
        const accepted = Math.random() > 0.2; // 80% acceptance rate

        await adminPb.collection('collaborators').create({
          blueprint: template.id,
          user: collab.id,
          permissionLevel: permission,
          invitedAt: invitedAt,
          acceptedAt: accepted ? randomDate(15) : null,
        });

        console.log(`   ✅ Added ${collab.displayName} as ${permission} to "${template.title}"`);
      } catch (error: unknown) {
        const err = error as { message?: string; data?: unknown };
        console.log(`   ⚠️  Failed to add collaborator: ${err.message}`);
        if ((error as { data?: unknown }).data) {
          console.log(`      Details: ${JSON.stringify((error as { data?: unknown }).data)}`);
        }
      }
    }
  }
}

async function createChecklists(
  users: CreatedUser[],
  templates: CreatedTemplate[]
): Promise<void> {
  console.log('\n📝 Creating checklists (instances)...');
  const primaryUser = users[0]!;

  // Ensure authenticated as primary user
  await pb.collection('users').authWithPassword(primaryUser.email, DEFAULT_PASSWORD);

  // Create multiple checklists for various templates
  const checklistNames = [
    'Summer Vacation 2025',
    'Business Trip - NYC',
    'Weekend Getaway',
    'Family Reunion Trip',
    'Conference Travel',
    'Spring Cleaning',
    'Monthly Deep Clean',
    'Pre-Holiday Cleaning',
    'Q1 Product Launch',
    'Feature Release v2.0',
    'New Hire - John Doe',
    'New Hire - Jane Smith',
    'Sarah & Mike Wedding',
    'Annual Physical 2025',
    'Emergency Kit Update',
    'College Apps - Emma',
    'Morning Routine Week 1',
    'Website Redesign Launch',
    'Code Review - PR #123',
    'Home Purchase - Oak Street',
  ];

  let checklistIndex = 0;

  for (const template of templates) {
    // Create 1-4 checklists per template
    const numChecklists = randomInt(1, 4);

    for (let i = 0; i < numChecklists && checklistIndex < checklistNames.length; i++) {
      try {
        const progress = randomInt(0, 100);
        const completedAt = progress === 100 ? randomDate(7) : null;

        const checklist = await pb.collection('instances').create({
          blueprint: template.id,
          user: primaryUser.id,
          name: checklistNames[checklistIndex] || `Checklist ${checklistIndex + 1}`,
          isSynced: true,
          progress: progress,
          completedAt: completedAt,
        });

        console.log(`   ✅ Created checklist: ${checklistNames[checklistIndex]} (${progress}% complete)`);

        // Create checklist items from template items
        await createChecklistItems(checklist.id, template.id, progress);

        checklistIndex++;
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.log(`   ⚠️  Failed to create checklist: ${err.message}`);
      }
    }
  }
}

async function createChecklistItems(
  checklistId: string,
  templateId: string,
  targetProgress: number
): Promise<void> {
  // Use admin client for creating checklist items
  if (!adminAuthenticated) {
    try {
      await adminPb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
      adminAuthenticated = true;
    } catch {
      console.log('      ⚠️  Admin auth failed, skipping checklist items');
      return;
    }
  }

  try {
    // Get all items for this template
    const templateItems = await adminPb.collection('items').getFullList({
      filter: `blueprint = "${templateId}"`,
      sort: 'path',
    });

    const totalItems = templateItems.length;
    const itemsToComplete = Math.floor((targetProgress / 100) * totalItems);
    let completedCount = 0;

    for (let idx = 0; idx < templateItems.length; idx++) {
      const item = templateItems[idx]!;
      const shouldComplete = completedCount < itemsToComplete;
      const itemPosition = (typeof item.position === 'number' && item.position > 0) ? item.position : idx + 1;
      
      await adminPb.collection('instanceItems').create({
        instance: checklistId,
        sourceItem: item.id,
        parent: null, // Simplified - not tracking parent hierarchy for instances
        path: item.path || String(itemPosition),
        content: item.content,
        isCompleted: shouldComplete,
        completedAt: shouldComplete ? randomDate(14) : null,
        isCustom: false,
        position: itemPosition,
      });

      if (shouldComplete) completedCount++;
    }
  } catch (error: unknown) {
    const err = error as { message?: string; data?: unknown };
    console.log(`      ⚠️  Failed to create checklist items: ${err.message}`);
    if ((error as { data?: unknown }).data) {
      console.log(`         Details: ${JSON.stringify((error as { data?: unknown }).data)}`);
    }
  }
}


async function createNotifications(users: CreatedUser[]): Promise<void> {
  console.log('\n📝 Creating notifications...');
  const primaryUser = users[0]!;

  // Ensure authenticated as primary user
  await pb.collection('users').authWithPassword(primaryUser.email, DEFAULT_PASSWORD);

  const notificationTemplates = [
    { type: 'collaboration_invite', title: 'New collaboration invite', message: 'Bob Smith invited you to collaborate on "Software Project Launch Checklist"' },
    { type: 'collaboration_accepted', title: 'Collaboration accepted', message: 'Carol Williams accepted your invitation to "Code Review Checklist"' },
    { type: 'blueprint_updated', title: 'Template updated', message: 'The template "Wedding Planning Checklist" has been updated with new items' },
    { type: 'instance_reminder', title: 'Checklist reminder', message: 'Your checklist "Summer Vacation 2025" is 75% complete. Keep going!' },
    { type: 'system', title: 'Welcome to CheckMate!', message: 'Get started by creating your first template or browsing public templates.' },
    { type: 'collaboration_invite', title: 'New collaboration invite', message: 'Emma Davis wants to collaborate on "Home Buying Checklist"' },
    { type: 'blueprint_updated', title: 'Template updated', message: 'New items added to "International Trip Packing List"' },
    { type: 'instance_reminder', title: 'Almost there!', message: 'Your checklist "Q1 Product Launch" is 90% complete!' },
    { type: 'system', title: 'New feature available', message: 'You can now export templates as JSON for sharing.' },
    { type: 'collaboration_accepted', title: 'Collaboration accepted', message: 'David Brown joined "New Employee Onboarding" as a viewer' },
  ];

  for (const notif of notificationTemplates) {
    try {
      await pb.collection('notifications').create({
        user: primaryUser.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        isRead: Math.random() > 0.5,
        data: {},
      });
      console.log(`   ✅ Created notification: ${notif.title}`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.log(`   ⚠️  Failed to create notification: ${err.message}`);
    }
  }
}

async function createAdditionalPublicTemplates(
  users: CreatedUser[],
  workspaces: CreatedWorkspace[]
): Promise<void> {
  console.log('\n📝 Creating additional public templates for discovery page overflow...');
  const primaryUser = users[0]!;
  const workspace = workspaces[0]!;

  await pb.collection('users').authWithPassword(primaryUser.email, DEFAULT_PASSWORD);

  // Create many simple templates to ensure scrolling is needed
  const additionalTemplates = [
    { title: 'Camping Trip Essentials', category: 'Travel', tags: ['camping', 'outdoor'] },
    { title: 'Road Trip Checklist', category: 'Travel', tags: ['road-trip', 'driving'] },
    { title: 'Beach Vacation Packing', category: 'Travel', tags: ['beach', 'summer'] },
    { title: 'Ski Trip Preparation', category: 'Travel', tags: ['skiing', 'winter'] },
    { title: 'Backpacking Europe', category: 'Travel', tags: ['backpacking', 'europe'] },
    { title: 'Business Meeting Prep', category: 'Work', tags: ['meeting', 'business'] },
    { title: 'Job Interview Checklist', category: 'Work', tags: ['interview', 'career'] },
    { title: 'Performance Review Prep', category: 'Work', tags: ['review', 'career'] },
    { title: 'Project Kickoff', category: 'Work', tags: ['project', 'planning'] },
    { title: 'Sprint Planning', category: 'Work', tags: ['agile', 'sprint'] },
    { title: 'Grocery Shopping List', category: 'Home', tags: ['shopping', 'groceries'] },
    { title: 'Meal Prep Sunday', category: 'Home', tags: ['cooking', 'meal-prep'] },
    { title: 'Garden Maintenance', category: 'Home', tags: ['garden', 'outdoor'] },
    { title: 'Car Maintenance Schedule', category: 'Home', tags: ['car', 'maintenance'] },
    { title: 'Pet Care Routine', category: 'Home', tags: ['pets', 'care'] },
    { title: 'Workout Routine', category: 'Health', tags: ['fitness', 'exercise'] },
    { title: 'Meditation Practice', category: 'Health', tags: ['meditation', 'mindfulness'] },
    { title: 'Sleep Hygiene', category: 'Health', tags: ['sleep', 'wellness'] },
    { title: 'Dental Care Routine', category: 'Health', tags: ['dental', 'hygiene'] },
    { title: 'Skincare Routine', category: 'Health', tags: ['skincare', 'beauty'] },
    { title: 'Budget Planning', category: 'Finance', tags: ['budget', 'money'] },
    { title: 'Tax Preparation', category: 'Finance', tags: ['taxes', 'finance'] },
    { title: 'Investment Review', category: 'Finance', tags: ['investing', 'portfolio'] },
    { title: 'Retirement Planning', category: 'Finance', tags: ['retirement', 'planning'] },
    { title: 'Debt Payoff Plan', category: 'Finance', tags: ['debt', 'finance'] },
    { title: 'Study Session', category: 'Education', tags: ['study', 'learning'] },
    { title: 'Research Paper', category: 'Education', tags: ['research', 'academic'] },
    { title: 'Exam Preparation', category: 'Education', tags: ['exam', 'study'] },
    { title: 'Language Learning', category: 'Education', tags: ['language', 'learning'] },
    { title: 'Online Course Completion', category: 'Education', tags: ['course', 'online'] },
  ];

  for (const tmpl of additionalTemplates) {
    try {
      const template = await pb.collection('blueprints').create({
        workspace: workspace.id,
        owner: primaryUser.id,
        title: tmpl.title,
        description: `A helpful checklist for ${tmpl.title.toLowerCase()}.`,
        visibility: 'public',
        category: tmpl.category,
        tags: tmpl.tags,
        version: 1,
        instanceCount: randomInt(10, 200),
        ratingSum: randomInt(30, 400),
        ratingCount: randomInt(10, 80),
      });

      // Add a few simple items
      const simpleItems = [
        'Prepare and gather materials',
        'Review requirements',
        'Execute main tasks',
        'Verify completion',
        'Clean up and organize',
      ];

      for (let i = 0; i < simpleItems.length; i++) {
        await pb.collection('items').create({
          blueprint: template.id,
          parent: null,
          path: String(i + 1),
          itemType: 'task',
          content: simpleItems[i],
          position: i + 1, // 1-based
        });
      }

      console.log(`   ✅ Created: ${tmpl.title}`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.log(`   ⚠️  Failed: ${err.message}`);
    }
  }
}


// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  console.log('🚀 CheckMate Seed Data Script');
  console.log('================================');
  console.log(`PocketBase URL: ${POCKETBASE_URL}`);
  console.log(`Default Password: ${DEFAULT_PASSWORD}`);
  console.log('');

  // Check PocketBase connection
  try {
    await pb.health.check();
    console.log('✅ PocketBase is running');
  } catch {
    console.error('❌ Cannot connect to PocketBase at', POCKETBASE_URL);
    console.error('   Make sure PocketBase is running.');
    process.exit(1);
  }

  // Authenticate admin client for privileged operations
  try {
    await adminPb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    adminAuthenticated = true;
    console.log('✅ Admin authenticated\n');
  } catch {
    console.log('⚠️  Admin auth failed - some operations may fail');
    console.log('   Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD if needed\n');
  }

  try {
    // Step 1: Create users
    const users = await createUsers();
    if (users.length === 0) {
      console.error('❌ No users created. Cannot continue.');
      process.exit(1);
    }

    // Step 2: Create workspaces
    const workspaces = await createWorkspaces(users);
    if (workspaces.length === 0) {
      console.error('❌ No workspaces created. Cannot continue.');
      process.exit(1);
    }

    // Step 3: Create templates with items
    const templates = await createTemplates(users, workspaces);

    // Step 4: Create collaborations
    await createCollaborations(users, templates);

    // Step 5: Create checklists (instances)
    await createChecklists(users, templates);

    // Step 6: Create notifications
    await createNotifications(users);

    // Step 7: Create additional public templates for overflow testing
    await createAdditionalPublicTemplates(users, workspaces);

    // Summary
    console.log('\n================================');
    console.log('✅ Seed data creation complete!');
    console.log('================================\n');
    console.log('📊 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Workspaces: ${workspaces.length}`);
    console.log(`   Templates: ${templates.length + 30} (including additional public templates)`);
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log(`   Primary User: alice@checkmate.test / ${DEFAULT_PASSWORD}`);
    console.log(`   Collaborator: bob@checkmate.test / ${DEFAULT_PASSWORD}`);
    console.log(`   Collaborator: carol@checkmate.test / ${DEFAULT_PASSWORD}`);
    console.log(`   Viewer: david@checkmate.test / ${DEFAULT_PASSWORD}`);
    console.log(`   Public User: emma@checkmate.test / ${DEFAULT_PASSWORD}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Seed script failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
