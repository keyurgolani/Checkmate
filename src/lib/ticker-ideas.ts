const TICKER_IDEAS = [
  // ── Home & Moving ──────────────────────────────────────────────
  {
    title: "Moving Day Checklist",
    pitch: "Share your move date, home size, and distance — I'll build a week-by-week countdown so nothing gets left behind.",
  },
  {
    title: "First Apartment Essentials",
    pitch: "Let me know your budget and room count, and I'll prioritize every item you actually need on day one.",
  },
  {
    title: "Home Buying Checklist",
    pitch: "Walk me through your price range, location, and must-haves — I'll organize every step from pre-approval to closing day.",
  },
  {
    title: "Deep Cleaning Checklist",
    pitch: "Pick the rooms and how thorough you want to go — I'll break it into a satisfying, room-by-room game plan.",
  },
  {
    title: "Home Maintenance Schedule",
    pitch: "Drop in your home's age, climate, and systems — I'll map seasonal tasks so nothing expensive sneaks up on you.",
  },
  {
    title: "Decluttering Checklist",
    pitch: "Choose your method — KonMari, room-by-room, or quick wins — and I'll create a clutter-free roadmap.",
  },
  {
    title: "Rental Inspection Checklist",
    pitch: "Moving in or out? I'll tailor a walkthrough list so you document every scratch and protect your deposit.",
  },
  {
    title: "Home Renovation Planner",
    pitch: "Give me the project scope, budget, and timeline — I'll sequence permits, materials, and contractor milestones.",
  },

  // ── Travel & Vacation ─────────────────────────────────────────
  {
    title: "Travel Packing List",
    pitch: "Where are you headed, for how long, and what's the weather? I'll build a packing list with zero overpacking.",
  },
  {
    title: "International Trip Prep",
    pitch: "Share your destination and passport country — I'll cover visas, vaccines, currency, and every pre-flight detail.",
  },
  {
    title: "Road Trip Planner",
    pitch: "Give me your route, car type, and vibe — scenic detours or fastest path — and I'll handle the rest.",
  },
  {
    title: "Camping Trip Checklist",
    pitch: "Car camping or backcountry? Tell me the season and group size, and I'll gear you up properly.",
  },
  {
    title: "Backpacking Gear List",
    pitch: "Share your trail, trip length, and experience level — I'll trim your pack weight without cutting comfort.",
  },
  {
    title: "Family Vacation Planner",
    pitch: "Kids' ages, destination, and budget — hand those over and I'll plan activities everyone will actually enjoy.",
  },
  {
    title: "Cruise Packing Checklist",
    pitch: "Which cruise line, itinerary, and formal nights? I'll make sure you're ready for every port and dinner.",
  },
  {
    title: "Business Travel Checklist",
    pitch: "Meetings, time zone, and trip length — I'll prep your essentials so you stay sharp on the road.",
  },

  // ── Events ────────────────────────────────────────────────────
  {
    title: "Wedding Planning Checklist",
    pitch: "Tell me your venue style, guest count, and budget — I'll map out every detail from save-the-dates to the last dance.",
  },
  {
    title: "Birthday Party Planner",
    pitch: "Age of the guest of honor, theme, and headcount — I'll make sure the celebration goes off without a hitch.",
  },
  {
    title: "Baby Shower Checklist",
    pitch: "Share the theme, guest list size, and venue — I'll organize games, favors, and the timeline down to the minute.",
  },
  {
    title: "Graduation Party Planner",
    pitch: "High school or college, indoor or outdoor? I'll tailor decorations, catering, and photo ops to the milestone.",
  },
  {
    title: "Dinner Party Checklist",
    pitch: "How many guests, dietary needs, and cuisine style? I'll plan the menu, table setting, and prep timeline.",
  },
  {
    title: "Fundraiser Event Planner",
    pitch: "Describe your cause, target amount, and event format — I'll structure sponsorships, logistics, and follow-ups.",
  },
  {
    title: "Housewarming Party Checklist",
    pitch: "New place, fresh start — share the space and guest count, and I'll plan a warm welcome party.",
  },
  {
    title: "Retirement Party Planner",
    pitch: "Years of service, hobbies, and guest of honor's personality — I'll craft a celebration that truly honors them.",
  },

  // ── Career & Professional ─────────────────────────────────────
  {
    title: "Job Search Checklist",
    pitch: "What's your field, experience level, and dream role? I'll organize every step from resume polish to offer negotiation.",
  },
  {
    title: "Interview Prep Checklist",
    pitch: "Share the company, role, and interview format — I'll prep your talking points, questions, and logistics.",
  },
  {
    title: "Onboarding Checklist",
    pitch: "New hire or new manager? Give me the role and company size, and I'll map the first 90 days.",
  },
  {
    title: "Performance Review Prep",
    pitch: "Jot down your wins and growth areas — I'll help you frame a compelling self-review before the meeting.",
  },
  {
    title: "Resume Update Checklist",
    pitch: "What industry and career stage? I'll walk you through refreshing every section so nothing impressive gets missed.",
  },
  {
    title: "Career Change Roadmap",
    pitch: "Current role and target industry — I'll sequence the skills, networking, and steps to make the leap.",
  },
  {
    title: "Conference Attendance Prep",
    pitch: "Which event, your goals, and who you want to meet — I'll maximize every session and connection.",
  },
  {
    title: "Work-From-Home Setup",
    pitch: "Budget, available space, and job type — I'll recommend the ergonomic and tech essentials you need.",
  },

  // ── Health & Wellness ─────────────────────────────────────────
  {
    title: "Annual Health Checkup",
    pitch: "Your age, gender, and family history shape which screenings matter — I'll build a personalized schedule.",
  },
  {
    title: "Mental Health Self-Care",
    pitch: "Share what drains you and what recharges you — I'll design a daily self-care routine that sticks.",
  },
  {
    title: "Morning Routine Builder",
    pitch: "Early bird or night owl, how much time do you have? I'll craft a morning flow that energizes your day.",
  },
  {
    title: "Sleep Hygiene Checklist",
    pitch: "Describe your bedtime struggles and schedule — I'll suggest a wind-down routine backed by sleep science.",
  },
  {
    title: "Meditation Starter Kit",
    pitch: "New to meditation or looking to deepen practice? I'll customize a progression that fits your lifestyle.",
  },
  {
    title: "Dental Care Checklist",
    pitch: "I'll set up a care routine and appointment schedule tailored to your dental history and goals.",
  },
  {
    title: "Prenatal Care Checklist",
    pitch: "Trimester, preferences, and provider — I'll outline appointments, nutrition, and prep milestones for each stage.",
  },
  {
    title: "Postpartum Recovery Plan",
    pitch: "Delivery type, support system, and personal goals — I'll organize recovery milestones and self-care reminders.",
  },

  // ── Education & Learning ──────────────────────────────────────
  {
    title: "Exam Study Planner",
    pitch: "Which exam, how many weeks, and your weakest subjects? I'll build a focused study schedule with review days.",
  },
  {
    title: "College Application Tracker",
    pitch: "List your target schools and deadlines — I'll organize essays, transcripts, and recommendation requests.",
  },
  {
    title: "Back-to-School Checklist",
    pitch: "Grade level, school supply list, and first-day jitters — I'll get the whole family prepped and confident.",
  },
  {
    title: "Online Course Completion",
    pitch: "Drop in the course name and your weekly availability — I'll pace out modules so you actually finish.",
  },
  {
    title: "Language Learning Plan",
    pitch: "Which language, your current level, and daily time? I'll structure vocabulary, grammar, and practice sessions.",
  },
  {
    title: "Research Paper Planner",
    pitch: "Topic, page count, and deadline — I'll break it into research, outline, drafts, and revision stages.",
  },
  {
    title: "Skill Development Tracker",
    pitch: "What skill are you building and by when? I'll chunk it into daily practice milestones you can measure.",
  },
  {
    title: "Book Reading Challenge",
    pitch: "How many books and what genres? I'll create a reading tracker with pace goals and reflection prompts.",
  },

  // ── Finance & Legal ───────────────────────────────────────────
  {
    title: "Tax Filing Checklist",
    pitch: "Employed, freelance, or both? Share your situation and I'll list every document you need before filing.",
  },
  {
    title: "Monthly Budget Setup",
    pitch: "Income, fixed expenses, and savings goal — I'll structure a budget framework you'll actually follow.",
  },
  {
    title: "Debt Payoff Planner",
    pitch: "List your balances and interest rates — I'll sequence a payoff strategy, snowball or avalanche style.",
  },
  {
    title: "Estate Planning Checklist",
    pitch: "Family structure, assets, and wishes — I'll outline the documents and conversations you shouldn't put off.",
  },
  {
    title: "Insurance Review Checklist",
    pitch: "Home, auto, health, life — share what you've got and I'll spot gaps in your coverage.",
  },
  {
    title: "Retirement Planning Steps",
    pitch: "Your age, income, and target retirement date — I'll organize the accounts, contributions, and milestones.",
  },
  {
    title: "Financial Audit Checklist",
    pitch: "Personal or business? I'll walk you through subscriptions, accounts, and spending patterns to review.",
  },
  {
    title: "Investment Portfolio Review",
    pitch: "Risk tolerance, time horizon, and current holdings — I'll create a rebalancing review checklist.",
  },

  // ── Technology & Digital ──────────────────────────────────────
  {
    title: "Digital Security Audit",
    pitch: "I'll walk through your passwords, 2FA setup, and privacy settings across every account that matters.",
  },
  {
    title: "New Phone Setup",
    pitch: "iPhone or Android, switching or upgrading? I'll cover data transfer, essential apps, and privacy settings.",
  },
  {
    title: "Website Launch Checklist",
    pitch: "Share your stack, launch date, and audience — I'll cover SEO, performance, security, and go-live steps.",
  },
  {
    title: "Social Media Cleanup",
    pitch: "Pick your platforms and privacy comfort level — I'll guide a thorough audit of posts, tags, and settings.",
  },
  {
    title: "App Development Checklist",
    pitch: "Platform, feature scope, and timeline — I'll organize design, development, testing, and store submission.",
  },
  {
    title: "Data Backup Plan",
    pitch: "Devices, cloud preference, and data sensitivity — I'll build a backup strategy that runs on autopilot.",
  },
  {
    title: "PC Build Checklist",
    pitch: "Gaming, creative work, or office use? Share your budget and I'll plan compatible parts and assembly steps.",
  },
  {
    title: "Digital Declutter Sprint",
    pitch: "Overflowing inbox, messy desktop, full cloud? Pick your pain points and I'll create a cleanup blitz.",
  },

  // ── Creative & Hobbies ───────────────────────────────────────
  {
    title: "Podcast Launch Checklist",
    pitch: "Niche, format, and episode cadence — I'll map out equipment, hosting, branding, and your first five episodes.",
  },
  {
    title: "YouTube Channel Setup",
    pitch: "Content niche, gear budget, and upload schedule — I'll organize everything from branding to your first upload.",
  },
  {
    title: "Photography Project Plan",
    pitch: "Genre, equipment, and creative vision — I'll structure shoots, editing workflow, and portfolio milestones.",
  },
  {
    title: "Novel Writing Tracker",
    pitch: "Genre, target word count, and deadline — I'll break it into outlining, drafting, and revision phases.",
  },
  {
    title: "Art Supply Checklist",
    pitch: "Medium, skill level, and project type — I'll list exactly what you need without overspending on extras.",
  },
  {
    title: "Music Practice Planner",
    pitch: "Instrument, skill level, and weekly hours? I'll structure warm-ups, technique drills, and repertoire goals.",
  },
  {
    title: "Craft Project Planner",
    pitch: "Knitting, woodworking, or something else? Share the project and I'll organize materials, steps, and timeline.",
  },
  {
    title: "DIY Home Project List",
    pitch: "Skill level, tools on hand, and project ideas — I'll prioritize by impact and difficulty so you start smart.",
  },

  // ── Family & Relationships ────────────────────────────────────
  {
    title: "New Baby Prep Checklist",
    pitch: "Due date, nursery theme, and budget — I'll prioritize gear, supplies, and setup tasks by trimester.",
  },
  {
    title: "Date Night Idea Bank",
    pitch: "Interests, budget, and adventurousness level — I'll curate a rotation of date ideas you'll both love.",
  },
  {
    title: "Family Game Night Setup",
    pitch: "Ages of players, group size, and game preferences — I'll suggest games, snacks, and a fun schedule.",
  },
  {
    title: "Relationship Check-In",
    pitch: "I'll create thoughtful conversation prompts and action items tailored to your relationship goals.",
  },
  {
    title: "Eldercare Planning Checklist",
    pitch: "Share the care level needed, location, and family involvement — I'll organize medical, legal, and daily tasks.",
  },
  {
    title: "Family Reunion Planner",
    pitch: "How many relatives, where, and what activities? I'll coordinate logistics so you can focus on catching up.",
  },

  // ── Business & Entrepreneurship ───────────────────────────────
  {
    title: "Business Launch Checklist",
    pitch: "Industry, business model, and launch timeline — I'll sequence registration, branding, and go-to-market steps.",
  },
  {
    title: "Product Launch Planner",
    pitch: "Product type, target audience, and launch date — I'll coordinate marketing, inventory, and launch-day tasks.",
  },
  {
    title: "Hiring Process Checklist",
    pitch: "Role, team size, and timeline — I'll map job posting, screening, interviews, and onboarding end to end.",
  },
  {
    title: "Brand Identity Checklist",
    pitch: "Industry, target audience, and brand personality — I'll cover logo, colors, voice, and every touchpoint.",
  },
  {
    title: "Investor Pitch Prep",
    pitch: "Stage, ask amount, and industry — I'll organize your deck, financials, and rehearsal talking points.",
  },
  {
    title: "E-commerce Store Setup",
    pitch: "Platform, product type, and shipping regions — I'll walk you from storefront design to first sale.",
  },
  {
    title: "Content Marketing Plan",
    pitch: "Niche, platforms, and publishing cadence — I'll structure an editorial calendar with topics and deadlines.",
  },
  {
    title: "Client Onboarding Checklist",
    pitch: "Service type, deliverables, and communication style — I'll create a smooth welcome process for new clients.",
  },

  // ── Seasonal & Holiday ────────────────────────────────────────
  {
    title: "Christmas Gift Planner",
    pitch: "Budget per person and recipient interests — I'll organize gift ideas, purchase tracking, and wrapping tasks.",
  },
  {
    title: "Thanksgiving Dinner Prep",
    pitch: "Guest count, dietary restrictions, and cooking skill — I'll plan the menu, shopping, and a cooking timeline.",
  },
  {
    title: "Halloween Party Checklist",
    pitch: "Spooky or silly, kids or adults? Share the vibe and I'll plan costumes, decor, and themed activities.",
  },
  {
    title: "Spring Cleaning Blitz",
    pitch: "Which rooms and how many days? I'll create a satisfying schedule with quick wins sprinkled in.",
  },
  {
    title: "Holiday Decorating Plan",
    pitch: "Which holiday, indoor or outdoor, and style preference — I'll organize a decorating checklist with setup order.",
  },
  {
    title: "New Year's Goal Setting",
    pitch: "Life areas you want to improve and your planning style — I'll structure actionable goals with milestones.",
  },
  {
    title: "Summer Bucket List",
    pitch: "Solo, couple, or family? Share your vibe and budget — I'll fill your summer with experiences worth remembering.",
  },
  {
    title: "Back-to-School Shopping",
    pitch: "Grade level, school requirements, and budget — I'll prioritize the list so you skip the last-minute rush.",
  },

  // ── Emergency & Safety ────────────────────────────────────────
  {
    title: "Emergency Kit Checklist",
    pitch: "Household size, region, and likely disasters — I'll build a kit list that keeps your family prepared.",
  },
  {
    title: "Fire Safety Checklist",
    pitch: "Home layout and family members — I'll map escape routes, extinguisher placement, and alarm schedules.",
  },
  {
    title: "Natural Disaster Prep",
    pitch: "Your region's risks — earthquake, hurricane, tornado? I'll customize supplies and an action plan.",
  },
  {
    title: "First Aid Kit Builder",
    pitch: "Family size, activities, and any medical conditions — I'll list everything your kit should contain.",
  },
  {
    title: "Power Outage Prep",
    pitch: "Climate, medical devices, and household needs — I'll plan supplies and backup power essentials.",
  },
  {
    title: "Home Security Audit",
    pitch: "House layout, neighborhood, and budget — I'll review locks, lighting, cameras, and daily habits.",
  },

  // ── Cooking & Meal Prep ───────────────────────────────────────
  {
    title: "Weekly Meal Prep Plan",
    pitch: "Dietary goals, household size, and cooking skill — I'll design a prep-day flow that saves hours all week.",
  },
  {
    title: "Pantry Staples Checklist",
    pitch: "Cuisine preferences and dietary needs — I'll stock your pantry so you can improvise meals anytime.",
  },
  {
    title: "Kitchen Setup Checklist",
    pitch: "Cooking style, counter space, and budget — I'll prioritize the tools and gadgets that actually earn their spot.",
  },
  {
    title: "Holiday Baking Planner",
    pitch: "Which treats, how many batches, and dietary swaps? I'll schedule baking days and ingredient shopping.",
  },
  {
    title: "Grocery Shopping List",
    pitch: "Meal plan for the week, household size, and store preference — I'll organize aisles so you shop in one pass.",
  },
  {
    title: "Dinner Party Menu Plan",
    pitch: "Course count, guest allergies, and cuisine — I'll plan a menu with a prep timeline that keeps you calm.",
  },

  // ── Fitness & Sports ──────────────────────────────────────────
  {
    title: "Marathon Training Plan",
    pitch: "Current fitness level, race date, and weekly mileage — I'll build a progressive training calendar.",
  },
  {
    title: "Gym Starter Checklist",
    pitch: "Fitness goals, available equipment, and days per week — I'll design a beginner-friendly routine.",
  },
  {
    title: "Yoga Practice Builder",
    pitch: "Experience level, focus areas, and session length — I'll sequence poses into a flowing daily practice.",
  },
  {
    title: "Sports Season Prep",
    pitch: "Which sport, age group, and team or solo? I'll cover gear, conditioning, and registration deadlines.",
  },
  {
    title: "Weight Loss Action Plan",
    pitch: "Starting point, target, and timeline — I'll combine nutrition and movement into sustainable daily habits.",
  },
  {
    title: "Home Workout Setup",
    pitch: "Space available, budget, and fitness goals — I'll recommend equipment and a routine that fits your room.",
  },

  // ── Pet Care ──────────────────────────────────────────────────
  {
    title: "New Puppy Checklist",
    pitch: "Breed, living space, and family members — I'll cover supplies, vet visits, and training milestones.",
  },
  {
    title: "Pet Travel Prep",
    pitch: "Destination, travel mode, and pet type — I'll organize documents, carriers, and comfort essentials.",
  },
  {
    title: "Pet Health Schedule",
    pitch: "Species, age, and breed — I'll map vaccinations, checkups, and preventive care across the year.",
  },
  {
    title: "New Cat Owner Guide",
    pitch: "Indoor, outdoor, or kitten? I'll list supplies, vet appointments, and home-proofing tasks.",
  },
  {
    title: "Pet Sitter Instructions",
    pitch: "Share your pet's routine, quirks, and emergency contacts — I'll create a clear guide any sitter can follow.",
  },

  // ── Vehicle & Auto ────────────────────────────────────────────
  {
    title: "Car Maintenance Schedule",
    pitch: "Make, model, mileage, and driving habits — I'll map oil changes, tire rotations, and every service interval.",
  },
  {
    title: "Road Trip Car Prep",
    pitch: "Trip distance, vehicle age, and season — I'll cover the mechanical checks and emergency supplies you need.",
  },
  {
    title: "New Car Buying Checklist",
    pitch: "Budget, must-have features, and new or used? I'll organize research, test drives, and negotiation steps.",
  },
  {
    title: "Car Detailing Checklist",
    pitch: "Interior, exterior, or full detail? I'll sequence products and steps for a showroom-quality finish.",
  },
  {
    title: "Winter Car Prep",
    pitch: "Climate severity and daily commute — I'll list tire, battery, fluid, and emergency kit essentials.",
  },

  // ── Gardening & Outdoors ──────────────────────────────────────
  {
    title: "Vegetable Garden Planner",
    pitch: "Zone, sunlight hours, and favorite veggies — I'll plan planting dates, spacing, and harvest timelines.",
  },
  {
    title: "Lawn Care Schedule",
    pitch: "Grass type, region, and yard size — I'll build a seasonal mowing, feeding, and treatment calendar.",
  },
  {
    title: "Indoor Plant Care Guide",
    pitch: "Light conditions, plant types, and your travel frequency — I'll set up a watering and care routine.",
  },
  {
    title: "Landscaping Project Plan",
    pitch: "Yard size, style vision, and budget — I'll organize design, materials, planting, and hardscape phases.",
  },
  {
    title: "Hiking Trip Checklist",
    pitch: "Trail difficulty, weather, and trip length — I'll pack your daypack with exactly what you need.",
  },
  {
    title: "Outdoor BBQ Party Plan",
    pitch: "Guest count, grill type, and menu vision — I'll prep the shopping, timeline, and setup checklist.",
  },

  // ── Self-Improvement ──────────────────────────────────────────
  {
    title: "Habit Tracker Setup",
    pitch: "Which habits and how many? I'll design a tracker with streaks, cues, and reward milestones.",
  },
  {
    title: "Digital Detox Plan",
    pitch: "How many days, which devices, and your triggers? I'll create a realistic screen-free transition plan.",
  },
  {
    title: "Journaling Starter Kit",
    pitch: "Goals, preferred format, and time of day — I'll suggest prompts and a cadence that makes journaling easy.",
  },
  {
    title: "Minimalist Living Checklist",
    pitch: "Which life areas feel cluttered? I'll create a phased plan to simplify possessions, schedule, and commitments.",
  },
  {
    title: "Productivity System Setup",
    pitch: "Work style, tools you already use, and biggest time sinks — I'll build a system that fits your brain.",
  },
  {
    title: "Public Speaking Prep",
    pitch: "Event type, audience size, and topic — I'll structure your talk, practice drills, and day-of checklist.",
  },
  {
    title: "Networking Action Plan",
    pitch: "Industry, goals, and comfort level — I'll plan events, conversation starters, and follow-up cadence.",
  },
  {
    title: "Volunteer Project Planner",
    pitch: "Cause, available hours, and skills to offer — I'll match opportunities and organize your commitment.",
  },
  {
    title: "Mindfulness Challenge",
    pitch: "Experience level and daily time available — I'll build a 30-day progression from breathing to body scans.",
  },
  {
    title: "Gratitude Practice Setup",
    pitch: "Preferred format — journal, app, or jar? I'll structure daily prompts that keep the practice fresh.",
  },

  // ── Additional / Miscellaneous ────────────────────────────────
  {
    title: "Wardrobe Capsule Builder",
    pitch: "Style preference, climate, and lifestyle — I'll curate a versatile closet with mix-and-match essentials.",
  },
  {
    title: "Sustainability Audit",
    pitch: "Home, shopping habits, and transportation — I'll find the highest-impact swaps for your carbon footprint.",
  },
  {
    title: "Side Hustle Launch Plan",
    pitch: "Skill set, available hours, and income goal — I'll organize the steps to turn your idea into revenue.",
  },
  {
    title: "Moving Abroad Checklist",
    pitch: "Destination country, visa type, and family size — I'll cover paperwork, logistics, and settling-in tasks.",
  },
  {
    title: "Wedding Guest Checklist",
    pitch: "Destination or local, dress code, and plus-one? I'll handle gift, outfit, travel, and RSVP details.",
  },
  {
    title: "College Dorm Packing List",
    pitch: "Dorm size, climate, and shared or single room — I'll prioritize the essentials and skip the clutter.",
  },
  {
    title: "Skincare Routine Builder",
    pitch: "Skin type, concerns, and budget — I'll build a morning and evening routine with product recommendations.",
  },
  {
    title: "Budget Travel Planner",
    pitch: "Destination, trip length, and spending limit — I'll find savings on flights, stays, and daily expenses.",
  },
  {
    title: "Small Business Tax Prep",
    pitch: "Business structure, revenue sources, and deductions — I'll organize every document your accountant needs.",
  },
  {
    title: "Podcast Listening Tracker",
    pitch: "Favorite genres and weekly listen time — I'll organize a queue with episodes and track your progress.",
  },
  {
    title: "Home Office Upgrade",
    pitch: "Budget, work type, and space dimensions — I'll prioritize upgrades that boost comfort and productivity.",
  },
  {
    title: "Relationship Bucket List",
    pitch: "Shared interests, travel dreams, and adventure tolerance — I'll build a list of experiences to share together.",
  },
];

export default TICKER_IDEAS;
