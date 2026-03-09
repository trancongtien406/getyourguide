import { PrismaPg } from '@prisma/adapter-pg';
import {
  BlogPostStatus,
  InventoryMode,
  MediaType,
  PrismaClient,
  SupplierStatus,
  TourStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const REFERENCE_EFFECTIVE_AT = new Date('2026-01-01T00:00:00.000Z');

const usersSeed = [
  {
    email: 'admin@getyourguide.local',
    firstName: 'System',
    lastName: 'Admin',
    phoneE164: '+84900000001',
    status: UserStatus.ACTIVE,
    roles: [UserRole.ADMIN],
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345',
  },
  {
    email: 'operator@getyourguide.local',
    firstName: 'Ops',
    lastName: 'Manager',
    phoneE164: '+84900000002',
    status: UserStatus.ACTIVE,
    roles: [UserRole.OPERATOR],
    password: process.env.SEED_OPERATOR_PASSWORD ?? 'Operator@12345',
  },
  {
    email: 'supplier.admin@getyourguide.local',
    firstName: 'Supplier',
    lastName: 'Admin',
    phoneE164: '+84900000003',
    status: UserStatus.ACTIVE,
    roles: [UserRole.SUPPLIER_ADMIN],
    password: process.env.SEED_SUPPLIER_ADMIN_PASSWORD ?? 'SupplierAdmin@12345',
  },
  {
    email: 'supplier.staff@getyourguide.local',
    firstName: 'Supplier',
    lastName: 'Staff',
    phoneE164: '+84900000004',
    status: UserStatus.ACTIVE,
    roles: [UserRole.SUPPLIER_STAFF],
    password: process.env.SEED_SUPPLIER_STAFF_PASSWORD ?? 'SupplierStaff@12345',
  },
  {
    email: 'customer@getyourguide.local',
    firstName: 'Demo',
    lastName: 'Customer',
    phoneE164: '+84900000005',
    status: UserStatus.ACTIVE,
    roles: [UserRole.CUSTOMER],
    password: process.env.SEED_CUSTOMER_PASSWORD ?? 'Customer@12345',
  },
];

async function seedReferenceData() {
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'fr', name: 'Français' },
  ];

  for (const item of languages) {
    await prisma.language.upsert({
      where: { code: item.code },
      update: { name: item.name },
      create: item,
    });
  }

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', decimals: 0 },
    { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  ];

  for (const item of currencies) {
    await prisma.currency.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
      },
      create: item,
    });
  }

  const countries = [
    { iso2: 'VN', iso3: 'VNM', name: 'Vietnam', currencyCode: 'VND' },
    { iso2: 'US', iso3: 'USA', name: 'United States', currencyCode: 'USD' },
    { iso2: 'FR', iso3: 'FRA', name: 'France', currencyCode: 'EUR' },
  ];

  for (const item of countries) {
    await prisma.country.upsert({
      where: { iso2: item.iso2 },
      update: {
        iso3: item.iso3,
        name: item.name,
        currencyCode: item.currencyCode,
      },
      create: item,
    });
  }

  const countryByIso2 = Object.fromEntries(
    (await prisma.country.findMany({ where: { iso2: { in: countries.map((x) => x.iso2) } } })).map(
      (item) => [item.iso2, item],
    ),
  );

  const cities = [
    {
      countryIso2: 'VN',
      name: 'Hà Nội',
      normalizedName: 'ha-noi',
      latitude: '21.027763',
      longitude: '105.834160',
      timezone: 'Asia/Ho_Chi_Minh',
    },
    {
      countryIso2: 'VN',
      name: 'Hồ Chí Minh',
      normalizedName: 'ho-chi-minh',
      latitude: '10.823099',
      longitude: '106.629662',
      timezone: 'Asia/Ho_Chi_Minh',
    },
    {
      countryIso2: 'US',
      name: 'New York',
      normalizedName: 'new-york',
      latitude: '40.712776',
      longitude: '-74.005974',
      timezone: 'America/New_York',
    },
  ];

  for (const item of cities) {
    const country = countryByIso2[item.countryIso2];
    if (!country) {
      continue;
    }

    await prisma.city.upsert({
      where: {
        countryId_normalizedName: {
          countryId: country.id,
          normalizedName: item.normalizedName,
        },
      },
      update: {
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        timezone: item.timezone,
      },
      create: {
        countryId: country.id,
        name: item.name,
        normalizedName: item.normalizedName,
        latitude: item.latitude,
        longitude: item.longitude,
        timezone: item.timezone,
      },
    });
  }

  const categories = [
    { slug: 'walking-tours', name: 'Walking Tours', sortOrder: 10 },
    { slug: 'food-drink', name: 'Food & Drink', sortOrder: 20 },
    { slug: 'museum-tickets', name: 'Museum Tickets', sortOrder: 30 },
  ];

  for (const item of categories) {
    await prisma.category.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        isActive: true,
        sortOrder: item.sortOrder,
      },
      create: {
        slug: item.slug,
        name: item.name,
        isActive: true,
        sortOrder: item.sortOrder,
      },
    });
  }

  await prisma.exchangeRate.upsert({
    where: {
      baseCurrency_quoteCurrency_effectiveAt: {
        baseCurrency: 'USD',
        quoteCurrency: 'VND',
        effectiveAt: REFERENCE_EFFECTIVE_AT,
      },
    },
    update: { rate: '25000' },
    create: {
      baseCurrency: 'USD',
      quoteCurrency: 'VND',
      rate: '25000',
      effectiveAt: REFERENCE_EFFECTIVE_AT,
    },
  });

  await prisma.exchangeRate.upsert({
    where: {
      baseCurrency_quoteCurrency_effectiveAt: {
        baseCurrency: 'EUR',
        quoteCurrency: 'VND',
        effectiveAt: REFERENCE_EFFECTIVE_AT,
      },
    },
    update: { rate: '27000' },
    create: {
      baseCurrency: 'EUR',
      quoteCurrency: 'VND',
      rate: '27000',
      effectiveAt: REFERENCE_EFFECTIVE_AT,
    },
  });

  await prisma.systemSetting.upsert({
    where: { settingKey: 'platform.defaultCurrency' },
    update: {
      settingValue: 'VND',
      valueType: 'string',
      isPublic: true,
      description: 'Default display currency for platform',
    },
    create: {
      settingKey: 'platform.defaultCurrency',
      settingValue: 'VND',
      valueType: 'string',
      isPublic: true,
      description: 'Default display currency for platform',
    },
  });

  await prisma.systemSetting.upsert({
    where: { settingKey: 'platform.supportEmail' },
    update: {
      settingValue: 'support@getyourguide.local',
      valueType: 'string',
      isPublic: true,
      description: 'Support contact email',
    },
    create: {
      settingKey: 'platform.supportEmail',
      settingValue: 'support@getyourguide.local',
      valueType: 'string',
      isPublic: true,
      description: 'Support contact email',
    },
  });
}

async function seedUsersAndRoles() {
  const usersByEmail = {};

  for (const item of usersSeed) {
    const passwordHash = await bcrypt.hash(item.password, 12);

    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        firstName: item.firstName,
        lastName: item.lastName,
        phoneE164: item.phoneE164,
        status: item.status,
        passwordHash,
      },
      create: {
        email: item.email,
        firstName: item.firstName,
        lastName: item.lastName,
        phoneE164: item.phoneE164,
        status: item.status,
        passwordHash,
      },
    });

    usersByEmail[item.email] = user;

    await prisma.userRoleAssignment.deleteMany({
      where: {
        userId: user.id,
        role: { notIn: item.roles },
      },
    });

    for (const role of item.roles) {
      await prisma.userRoleAssignment.upsert({
        where: {
          userId_role: {
            userId: user.id,
            role,
          },
        },
        update: {},
        create: {
          userId: user.id,
          role,
        },
      });
    }
  }

  return usersByEmail;
}

async function seedSupplierMapping(usersByEmail) {
  const supplier = await prisma.supplier.upsert({
    where: { slug: 'demo-supplier' },
    update: {
      legalName: 'Demo Supplier LLC',
      displayName: 'Demo Supplier',
      status: SupplierStatus.ACTIVE,
      email: 'supplier@getyourguide.local',
      phoneE164: '+84900000100',
      addressLine: '1 Demo Street',
    },
    create: {
      legalName: 'Demo Supplier LLC',
      displayName: 'Demo Supplier',
      slug: 'demo-supplier',
      status: SupplierStatus.ACTIVE,
      email: 'supplier@getyourguide.local',
      phoneE164: '+84900000100',
      addressLine: '1 Demo Street',
    },
  });

  const supplierAdmin = usersByEmail['supplier.admin@getyourguide.local'];
  const supplierStaff = usersByEmail['supplier.staff@getyourguide.local'];

  if (supplierAdmin) {
    await prisma.supplierUser.upsert({
      where: {
        supplierId_userId_role: {
          supplierId: supplier.id,
          userId: supplierAdmin.id,
          role: UserRole.SUPPLIER_ADMIN,
        },
      },
      update: {},
      create: {
        supplierId: supplier.id,
        userId: supplierAdmin.id,
        role: UserRole.SUPPLIER_ADMIN,
      },
    });
  }

  if (supplierStaff) {
    await prisma.supplierUser.upsert({
      where: {
        supplierId_userId_role: {
          supplierId: supplier.id,
          userId: supplierStaff.id,
          role: UserRole.SUPPLIER_STAFF,
        },
      },
      update: {},
      create: {
        supplierId: supplier.id,
        userId: supplierStaff.id,
        role: UserRole.SUPPLIER_STAFF,
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────
// FAQ Seed
// ─────────────────────────────────────────────────────────────────────

async function seedFaq() {
  const faqCategories = [
    { slug: 'booking', name: 'Booking & Reservations', sortOrder: 10 },
    { slug: 'payment', name: 'Payment & Pricing', sortOrder: 20 },
    { slug: 'cancellation', name: 'Cancellations & Refunds', sortOrder: 30 },
    { slug: 'account', name: 'Account & Settings', sortOrder: 40 },
    { slug: 'tours-activities', name: 'Tours & Activities', sortOrder: 50 },
  ];

  const categoryMap = {};

  for (const cat of faqCategories) {
    const record = await prisma.supportFaqCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder, isActive: true },
      create: { slug: cat.slug, name: cat.name, sortOrder: cat.sortOrder, isActive: true },
    });
    categoryMap[cat.slug] = record.id;
  }

  const faqItems = [
    // Booking
    {
      slug: 'how-to-book-tour',
      categorySlug: 'booking',
      question: 'How do I book a tour?',
      answer:
        'Browse our catalog, select your preferred tour and date, choose the number of travelers, and proceed to checkout. You will receive a confirmation email with your voucher.',
      sortOrder: 10,
    },
    {
      slug: 'booking-confirmation-time',
      categorySlug: 'booking',
      question: 'How long does booking confirmation take?',
      answer:
        'Most bookings are confirmed instantly. Some tours require manual confirmation from the supplier, which typically takes up to 24 hours.',
      sortOrder: 20,
    },
    {
      slug: 'book-for-someone-else',
      categorySlug: 'booking',
      question: 'Can I book for someone else?',
      answer:
        'Yes! During checkout, you can enter the lead traveler\'s details. The voucher will be sent to your email, and you can forward it to the participant.',
      sortOrder: 30,
    },
    // Payment
    {
      slug: 'accepted-payment-methods',
      categorySlug: 'payment',
      question: 'What payment methods do you accept?',
      answer:
        'We accept Visa, Mastercard, American Express, and local payment methods depending on your region. All payments are processed securely.',
      sortOrder: 10,
    },
    {
      slug: 'currency-charges',
      categorySlug: 'payment',
      question: 'What currency will I be charged in?',
      answer:
        'You can choose your preferred display currency on the site. Your bank may apply a conversion fee if your card currency differs from the charge currency.',
      sortOrder: 20,
    },
    {
      slug: 'hidden-fees',
      categorySlug: 'payment',
      question: 'Are there any hidden fees?',
      answer:
        'No. The price you see during checkout is the final price. All taxes and service fees are included in the displayed amount.',
      sortOrder: 30,
    },
    // Cancellation
    {
      slug: 'how-to-cancel',
      categorySlug: 'cancellation',
      question: 'How do I cancel a booking?',
      answer:
        'Go to "My Bookings" in your account, select the booking, and click "Cancel". Refund eligibility depends on the tour\'s cancellation policy.',
      sortOrder: 10,
    },
    {
      slug: 'refund-timeline',
      categorySlug: 'cancellation',
      question: 'How long does a refund take?',
      answer:
        'Refunds typically appear on your statement within 5–10 business days, depending on your bank or payment provider.',
      sortOrder: 20,
    },
    // Account
    {
      slug: 'how-to-create-account',
      categorySlug: 'account',
      question: 'How do I create an account?',
      answer:
        'Click "Sign Up" on the top right, enter your email and password, and verify your email. You can also sign up using Google or Facebook.',
      sortOrder: 10,
    },
    {
      slug: 'reset-password',
      categorySlug: 'account',
      question: 'I forgot my password. How do I reset it?',
      answer:
        'Click "Sign In", then "Forgot Password". Enter your email and we\'ll send you a reset link. The link expires after 1 hour.',
      sortOrder: 20,
    },
    // Tours & Activities
    {
      slug: 'what-to-bring',
      categorySlug: 'tours-activities',
      question: 'What should I bring to a tour?',
      answer:
        'Each tour page lists what is included and excluded. Generally, bring comfortable shoes, weather-appropriate clothing, sunscreen, and your voucher (digital or printed).',
      sortOrder: 10,
    },
    {
      slug: 'tour-language',
      categorySlug: 'tours-activities',
      question: 'What language are tours conducted in?',
      answer:
        'Tour languages are listed on each tour page. Many tours offer multiple language options. You can filter by language when browsing.',
      sortOrder: 20,
    },
  ];

  for (const item of faqItems) {
    const categoryId = categoryMap[item.categorySlug] || null;
    await prisma.supportFaqItem.upsert({
      where: { slug: item.slug },
      update: {
        categoryId,
        question: item.question,
        answer: item.answer,
        sortOrder: item.sortOrder,
        isActive: true,
      },
      create: {
        categoryId,
        slug: item.slug,
        question: item.question,
        answer: item.answer,
        sortOrder: item.sortOrder,
        isActive: true,
      },
    });
  }

  console.log(`  ✓ FAQ: ${faqCategories.length} categories, ${faqItems.length} items`);
}

// ─────────────────────────────────────────────────────────────────────
// Blog Seed
// ─────────────────────────────────────────────────────────────────────

async function seedBlog(usersByEmail) {
  const adminUser = usersByEmail['admin@getyourguide.local'];

  // Blog categories
  const blogCategories = [
    { slug: 'travel-tips', name: 'Travel Tips', description: 'Expert advice for smarter travel', sortOrder: 10 },
    { slug: 'destination-guides', name: 'Destination Guides', description: 'In-depth guides to popular destinations', sortOrder: 20 },
    { slug: 'food-culture', name: 'Food & Culture', description: 'Explore local cuisine and cultural experiences', sortOrder: 30 },
    { slug: 'adventure', name: 'Adventure', description: 'Outdoor activities, hiking, and extreme sports', sortOrder: 40 },
  ];

  const blogCategoryMap = {};

  for (const cat of blogCategories) {
    const record = await prisma.blogCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder, isActive: true },
      create: { slug: cat.slug, name: cat.name, description: cat.description, sortOrder: cat.sortOrder, isActive: true },
    });
    blogCategoryMap[cat.slug] = record.id;
  }

  // Blog tags
  const blogTags = [
    { slug: 'vietnam', name: 'Vietnam' },
    { slug: 'hanoi', name: 'Hanoi' },
    { slug: 'ho-chi-minh', name: 'Ho Chi Minh City' },
    { slug: 'street-food', name: 'Street Food' },
    { slug: 'budget-travel', name: 'Budget Travel' },
    { slug: 'first-time', name: 'First Time Visitor' },
    { slug: 'photography', name: 'Photography' },
    { slug: 'family', name: 'Family Travel' },
  ];

  const blogTagMap = {};

  for (const tag of blogTags) {
    const record = await prisma.blogTag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: { slug: tag.slug, name: tag.name },
    });
    blogTagMap[tag.slug] = record.id;
  }

  // Blog posts
  const blogPosts = [
    {
      slug: 'top-10-things-to-do-in-hanoi',
      title: 'Top 10 Things to Do in Hanoi',
      excerpt: 'Discover the best attractions, street food spots, and hidden gems in Vietnam\'s charming capital city.',
      content: `# Top 10 Things to Do in Hanoi

Hanoi, the capital of Vietnam, is a mesmerizing blend of ancient temples, French colonial architecture, and vibrant street life. Here are the top experiences you shouldn't miss:

## 1. Explore the Old Quarter
Wander through the maze of 36 streets, each named after the goods traditionally sold there. The bustling atmosphere, street vendors, and colonial shophouses make this a photographer's paradise.

## 2. Visit Hoan Kiem Lake
The spiritual heart of Hanoi, this scenic lake features the iconic red Huc Bridge leading to Ngoc Son Temple. Come early morning to see locals practicing tai chi.

## 3. Ho Chi Minh Mausoleum Complex
Pay respects at the mausoleum and explore the surrounding presidential palace, One Pillar Pagoda, and beautiful gardens.

## 4. Taste Street Food
From pho bo (beef noodle soup) to bun cha (grilled pork noodles) and egg coffee, Hanoi is a street food capital. Join a food tour for the best experience.

## 5. Temple of Literature
Vietnam's first university, built in 1070, showcases stunning traditional architecture and peaceful gardens.

## 6. Train Street
Watch trains pass just inches from houses and cafes on this famous narrow street. Best experienced in the late afternoon.

## 7. Water Puppet Theatre
This unique Vietnamese art form dates back to the 11th century and tells stories of rural life through puppets dancing on water.

## 8. Dong Xuan Market
Hanoi's largest indoor market offers everything from fresh produce to textiles, electronics, and souvenirs.

## 9. West Lake (Tay Ho)
Escape the city buzz at Hanoi's largest lake, dotted with temples, pagodas, and lakeside cafes.

## 10. Day Trip to Ninh Binh
Just 2 hours from Hanoi, explore the stunning karst landscapes, rice paddies, and river caves of "Ha Long Bay on land."

---
*Planning your Hanoi trip? Browse our curated tours and activities for the best deals.*`,
      categorySlug: 'destination-guides',
      tagSlugs: ['vietnam', 'hanoi', 'first-time'],
      status: BlogPostStatus.PUBLISHED,
      isFeatured: true,
      seoTitle: 'Top 10 Things to Do in Hanoi 2026 | GetYourGuide',
      seoDescription: 'Plan your Hanoi trip with our guide to the top 10 attractions, from the Old Quarter to street food and day trips.',
      readTimeMinutes: 8,
    },
    {
      slug: 'ultimate-vietnam-street-food-guide',
      title: 'The Ultimate Vietnam Street Food Guide',
      excerpt: 'A foodie\'s guide to the must-try dishes across Vietnam — from north to south.',
      content: `# The Ultimate Vietnam Street Food Guide

Vietnam's street food scene is legendary. Every city and region has its own specialties, prepared fresh at sidewalk stalls and tiny restaurants.

## Northern Vietnam

**Pho Bo** — The iconic beef noodle soup originated in Hanoi. Look for shops that have been serving since the 1950s.

**Bun Cha** — Grilled pork patties served with rice noodles, fresh herbs, and dipping sauce. Made famous internationally after a certain presidential dinner.

**Banh Cuon** — Delicate steamed rice rolls filled with minced pork and mushrooms.

## Central Vietnam

**Bun Bo Hue** — A rich, spicy beef noodle soup that packs more heat than its northern cousins.

**Banh Xeo** — Sizzling crepes filled with shrimp, pork, and bean sprouts. Wrap in rice paper with herbs.

**Cao Lau** — A Hoi An specialty with thick noodles, barbecue pork, and crispy croutons.

## Southern Vietnam

**Com Tam** — Broken rice served with grilled pork chop, shredded pork skin, and egg meatloaf.

**Banh Mi** — The Vietnamese baguette sandwich, perfected in Saigon with countless filling variations.

**Che** — Sweet dessert soups with beans, jelly, coconut milk, and ice — perfect for hot days.

## Tips for Street Food Adventures
1. Look for busy stalls — high turnover means fresh food
2. Carry small bills (VND 10,000–50,000)
3. Sit on the tiny plastic chairs like a local
4. Don't skip the dipping sauces — they make the dish

---
*Join one of our guided food tours to explore the best street food with a local expert.*`,
      categorySlug: 'food-culture',
      tagSlugs: ['vietnam', 'street-food'],
      status: BlogPostStatus.PUBLISHED,
      isFeatured: false,
      seoTitle: 'Vietnam Street Food Guide 2026 | Must-Try Dishes',
      seoDescription: 'Explore the best Vietnamese street food from pho to banh mi. Regional specialties, tips, and recommended food tours.',
      readTimeMinutes: 6,
    },
    {
      slug: 'budget-travel-tips-southeast-asia',
      title: '15 Budget Travel Tips for Southeast Asia',
      excerpt: 'Travel more for less with these proven money-saving tips for backpackers and budget travelers.',
      content: `# 15 Budget Travel Tips for Southeast Asia

Southeast Asia remains one of the most affordable travel destinations in the world. Here's how to stretch your budget even further:

1. **Travel in shoulder season** — Prices drop 30–50% between peak and low seasons.
2. **Book direct with local operators** — Skip the middleman for better prices.
3. **Eat where locals eat** — Street food costs $1–3 per meal.
4. **Use overnight transport** — Save on accommodation by taking night buses or trains.
5. **Negotiate respectfully** — Haggling is expected at markets, but keep it friendly.
6. **Stay in hostels or guesthouses** — Dorm beds start at $5/night.
7. **Use Grab instead of airport taxis** — Ride-hailing apps offer fixed, fair prices.
8. **Carry a reusable water bottle** — Many hostels offer free refill stations.
9. **Get a local SIM card** — Much cheaper than roaming at $3–5 for a tourist SIM.
10. **Visit free attractions** — Temples, markets, parks, and beaches are often free.
11. **Travel slow** — Staying longer in one place reduces transport costs.
12. **Cook occasionally** — Markets sell fresh produce for very little.
13. **Use free walking tours** — Tip-based tours are available in most major cities.
14. **Book multi-day tours** — Package deals are cheaper than booking activities separately.
15. **Travel insurance is non-negotiable** — A $30/month policy can save thousands.

---
*Looking for affordable tours? Filter by price on our platform to find the best deals.*`,
      categorySlug: 'travel-tips',
      tagSlugs: ['budget-travel', 'first-time'],
      status: BlogPostStatus.PUBLISHED,
      isFeatured: false,
      seoTitle: '15 Budget Travel Tips for Southeast Asia 2026',
      seoDescription: 'Save money traveling Southeast Asia with 15 proven budget tips covering food, transport, accommodation, and activities.',
      readTimeMinutes: 5,
    },
    {
      slug: 'family-friendly-activities-ho-chi-minh',
      title: 'Best Family-Friendly Activities in Ho Chi Minh City',
      excerpt: 'Fun things to do with kids in Saigon — from museums to cooking classes and river cruises.',
      content: `# Best Family-Friendly Activities in Ho Chi Minh City

Ho Chi Minh City (Saigon) is surprisingly family-friendly. Here are the top activities that kids and parents will both enjoy:

## Indoor Activities
- **War Remnants Museum** — Educational and thought-provoking (suitable for older kids)
- **Artinus 3D Art Museum** — Interactive 3D paintings perfect for fun photos
- **Saigon Central Post Office** — Beautiful architecture, quick visit

## Outdoor Adventures
- **Cu Chi Tunnels** — A fascinating historical site where kids can crawl through real tunnels
- **Mekong Delta Day Trip** — Boat rides, coconut candy making, and tropical fruit tasting
- **Saigon Zoo and Botanical Gardens** — Over 100 species in a lush tropical setting

## Food Experiences
- **Vietnamese Cooking Class** — Hands-on classes designed for families
- **Saigon Street Food by Cyclo** — Explore the city's flavors from a traditional cyclo

## Evening Entertainment
- **Saigon River Dinner Cruise** — Beautiful city views with live entertainment
- **Ben Thanh Night Market** — Shopping and street food after dark

## Practical Tips
- The best time to visit is December–March (dry season)
- Book morning activities to avoid the afternoon heat
- Most tour operators have child-friendly pricing

---
*Browse our family-friendly tours in Ho Chi Minh City for easy, stress-free booking.*`,
      categorySlug: 'destination-guides',
      tagSlugs: ['vietnam', 'ho-chi-minh', 'family'],
      status: BlogPostStatus.PUBLISHED,
      isFeatured: true,
      seoTitle: 'Family Activities in Ho Chi Minh City 2026',
      seoDescription: 'Top family-friendly activities in Saigon: museums, river cruises, cooking classes, and day trips for all ages.',
      readTimeMinutes: 5,
    },
    {
      slug: 'photography-tips-travel',
      title: '10 Travel Photography Tips for Beginners',
      excerpt: 'Capture stunning travel photos with your phone or camera using these simple composition and lighting tips.',
      content: `# 10 Travel Photography Tips for Beginners

Great travel photos don't require expensive gear. Here's how to level up your travel photography:

1. **Shoot during golden hour** — The first and last hour of sunlight creates magical warm tones.
2. **Use the rule of thirds** — Place subjects off-center for more dynamic compositions.
3. **Include people for scale** — A person in a landscape photo adds depth and storytelling.
4. **Get low or high** — Unusual angles make ordinary subjects extraordinary.
5. **Clean your lens** — Sounds simple, but smudges ruin more photos than bad technique.
6. **Tell a story** — Capture the small details: food, hands, signs, textures.
7. **Learn basic editing** — Apps like Lightroom Mobile are free and powerful.
8. **Backup daily** — Upload to cloud storage every night to avoid losing precious memories.
9. **Ask permission** — When photographing locals, always ask first. A smile and gesture go a long way.
10. **Put the camera down sometimes** — The best travel memories aren't always captured on screen.

---
*Many of our tours include stops at the most photography-worthy locations. Check tour descriptions for photo opportunity highlights.*`,
      categorySlug: 'travel-tips',
      tagSlugs: ['photography', 'first-time'],
      status: BlogPostStatus.DRAFT,
      isFeatured: false,
      seoTitle: '10 Travel Photography Tips for Beginners 2026',
      seoDescription: 'Improve your travel photography with 10 simple tips on composition, lighting, and editing for phone and camera.',
      readTimeMinutes: 4,
    },
  ];

  for (const post of blogPosts) {
    const categoryId = blogCategoryMap[post.categorySlug] || null;
    const blogPost = await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        authorUserId: adminUser?.id || null,
        categoryId,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        status: post.status,
        isFeatured: post.isFeatured,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        readTimeMinutes: post.readTimeMinutes,
        publishedAt: post.status === BlogPostStatus.PUBLISHED ? new Date() : null,
      },
      create: {
        authorUserId: adminUser?.id || null,
        categoryId,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        status: post.status,
        isFeatured: post.isFeatured,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        seoKeywords: [],
        readTimeMinutes: post.readTimeMinutes,
        publishedAt: post.status === BlogPostStatus.PUBLISHED ? new Date() : null,
      },
    });

    // Attach tags
    if (post.tagSlugs?.length) {
      for (const tagSlug of post.tagSlugs) {
        const tagId = blogTagMap[tagSlug];
        if (tagId) {
          await prisma.blogPostTag.upsert({
            where: { postId_tagId: { postId: blogPost.id, tagId } },
            update: {},
            create: { postId: blogPost.id, tagId },
          });
        }
      }
    }
  }

  console.log(`  ✓ Blog: ${blogCategories.length} categories, ${blogTags.length} tags, ${blogPosts.length} posts`);
}

// ─────────────────────────────────────────────────────────────────────
// Tour Seed
// ─────────────────────────────────────────────────────────────────────

async function seedTours() {
  // Look up the demo supplier
  const supplier = await prisma.supplier.findUnique({ where: { slug: 'demo-supplier' } });
  if (!supplier) {
    console.log('  ⚠ Skipping tours — demo supplier not found');
    return;
  }

  // Look up cities
  const cities = await prisma.city.findMany();
  const cityByNorm = Object.fromEntries(cities.map((c) => [c.normalizedName, c]));

  const hanoiCity = cityByNorm['ha-noi'];
  const hcmCity = cityByNorm['ho-chi-minh'];
  const nyCity = cityByNorm['new-york'];

  if (!hanoiCity && !hcmCity) {
    console.log('  ⚠ Skipping tours — no cities found');
    return;
  }

  // Look up categories
  const walkingCat = await prisma.category.findUnique({ where: { slug: 'walking-tours' } });
  const foodCat = await prisma.category.findUnique({ where: { slug: 'food-drink' } });
  const museumCat = await prisma.category.findUnique({ where: { slug: 'museum-tickets' } });

  // Tour tags
  const tourTags = [
    { slug: 'best-seller', name: 'Best Seller' },
    { slug: 'skip-the-line', name: 'Skip the Line' },
    { slug: 'small-group', name: 'Small Group' },
    { slug: 'private-tour', name: 'Private Tour' },
    { slug: 'family-friendly', name: 'Family Friendly' },
    { slug: 'local-guide', name: 'Local Guide' },
  ];

  const tourTagMap = {};
  for (const tag of tourTags) {
    const record = await prisma.tourTag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: { slug: tag.slug, name: tag.name },
    });
    tourTagMap[tag.slug] = record.id;
  }

  const toursData = [
    {
      slug: 'hanoi-old-quarter-walking-tour',
      title: 'Hanoi Old Quarter Walking Tour',
      shortDescription: 'Discover the charm of Hanoi\'s historic 36 streets with a local guide.',
      fullDescription:
        'Explore the 1,000-year-old Old Quarter of Hanoi with an experienced local guide. Visit ancient temples, hidden alleys, and bustling markets. Learn about the fascinating history behind each of the 36 streets, named after the traditional trades that once flourished there. Stop for egg coffee at a legendary café and soak in the vibrant atmosphere of Vietnam\'s capital.',
      cityId: hanoiCity?.id,
      meetingPoint: 'Hoan Kiem Lake — North Shore Entrance',
      latitude: '21.028511',
      longitude: '105.852234',
      durationMinutes: 180,
      maxGroupSize: 12,
      status: TourStatus.PUBLISHED,
      inventoryMode: InventoryMode.PER_DEPARTURE,
      highlights: ['Visit 5 hidden temples', 'Taste authentic egg coffee', 'Explore 36 ancient streets', 'Small group experience'],
      includedItems: ['Professional English-speaking guide', 'Egg coffee tasting', 'Bottled water'],
      excludedItems: ['Lunch', 'Personal expenses', 'Tips'],
      whatToBring: [
        'Comfortable walking shoes',
        'Light jacket or raincoat (depending on season)',
        'Camera or smartphone for photos',
        'Reusable water bottle',
      ],
      importantInfo: [
        'Tour operates in light rain; heavy rain may cause itinerary adjustments.',
        'Not recommended for guests with severe mobility issues.',
        'Please arrive at the meeting point 10 minutes before departure.',
      ],
      cancellationPolicy: { type: 'FREE', freeCancelHoursBefore: 24 },
      availableLanguages: ['English', 'Vietnamese'],
      allowPayLater: true,
      tagSlugs: ['best-seller', 'small-group', 'local-guide'],
      categorySlugs: ['walking-tours'],
      itineraryStops: [
        {
          stopOrder: 1,
          title: 'Hoan Kiem Lake & Ngoc Son Temple',
          description:
            'Start with an introduction to Hanoi at Hoan Kiem Lake and cross the iconic red bridge to Ngoc Son Temple.',
          durationMinutes: 30,
          latitude: '21.028511',
          longitude: '105.852234',
        },
        {
          stopOrder: 2,
          title: 'Old Quarter 36 Streets',
          description:
            'Walk through narrow alleys and traditional guild streets while learning about their history and trades.',
          durationMinutes: 80,
          latitude: '21.035',
          longitude: '105.848',
        },
        {
          stopOrder: 3,
          title: 'Hidden Temple & Local Market',
          description:
            'Visit a lesser-known temple and a bustling local market where residents shop for daily essentials.',
          durationMinutes: 40,
          latitude: '21.037',
          longitude: '105.846',
        },
        {
          stopOrder: 4,
          title: 'Egg Coffee at Local Café',
          description:
            'End the tour at a classic café to taste Hanoi’s famous egg coffee with a lake view when available.',
          durationMinutes: 30,
          latitude: '21.0288',
          longitude: '105.8524',
        },
      ],
      media: [
        {
          url: 'https://images.unsplash.com/photo-1528127269322-539801943592',
          altText: 'Hanoi Old Quarter street view',
          sortOrder: 1,
          isCover: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d',
          altText: 'Hoan Kiem Lake in the morning',
          sortOrder: 2,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e',
          altText: 'Traditional Vietnamese egg coffee',
          sortOrder: 3,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
          altText: 'Old quarter narrow alley with vendors',
          sortOrder: 4,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1608023136034-20d01f7125df',
          altText: 'Temple entrance in Hanoi',
          sortOrder: 5,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1549897164-6bdb3034eac5',
          altText: 'Local market in Hanoi Old Quarter',
          sortOrder: 6,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1526481280695-3c687fd543c0',
          altText: 'Street with hanging lanterns in Hanoi',
          sortOrder: 7,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1541427468627-a89a96e5cae7',
          altText: 'Tourists walking in Hanoi Old Quarter',
          sortOrder: 8,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1583391733956-6c9fd70b16e6',
          altText: 'Crowded street crossroad in Hanoi',
          sortOrder: 9,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1526481280693-3b113a1c79ff',
          altText: 'Old buildings and shops in Hanoi',
          sortOrder: 10,
          isCover: false,
        },
      ],
      options: [
        {
          code: 'group',
          title: 'Group Tour',
          description: 'Join a small group of up to 12 people',
          isDefault: true,
          priceAdult: 25,
          priceChild: 15,
        },
        {
          code: 'private',
          title: 'Private Tour',
          description: 'Exclusive tour for your party only',
          isDefault: false,
          priceAdult: 65,
          priceChild: 40,
        },
      ],
    },
    {
      slug: 'hanoi-street-food-evening-tour',
      title: 'Hanoi Street Food Evening Tour',
      shortDescription: 'Taste the best of Hanoi\'s legendary street food scene after dark.',
      fullDescription:
        'Join us for an unforgettable evening of flavors as we navigate Hanoi\'s buzzing street food scene. Sample 10+ dishes across 5 stops, including pho, bun cha, banh mi, and the famous egg coffee. Your foodie guide will share stories behind each dish and take you to spots only locals know.',
      cityId: hanoiCity?.id,
      meetingPoint: 'Dong Xuan Market — Main Gate',
      latitude: '21.037',
      longitude: '105.849',
      durationMinutes: 210,
      maxGroupSize: 10,
      status: TourStatus.PUBLISHED,
      inventoryMode: InventoryMode.PER_DEPARTURE,
      highlights: ['10+ dishes tasting', 'Visit hidden local eateries', 'Egg coffee experience', 'Vegetarian options available'],
      includedItems: ['All food tastings', 'Local foodie guide', 'Bottled water', 'Wet wipes'],
      excludedItems: ['Alcoholic beverages', 'Hotel pickup/drop-off'],
      whatToBring: [
        'Comfortable walking shoes or sandals',
        'Loose clothing suitable for hot weather',
        'Small backpack for personal items',
      ],
      importantInfo: [
        'Please inform us in advance about any food allergies or dietary restrictions.',
        'Vegetarian options are available at most stops but vegan options are limited.',
        'Tour runs in all weather conditions; bring a light raincoat in rainy season.',
      ],
      cancellationPolicy: { type: 'FREE', freeCancelHoursBefore: 24 },
      availableLanguages: ['English', 'Vietnamese'],
      allowPayLater: true,
      tagSlugs: ['best-seller', 'small-group', 'local-guide'],
      categorySlugs: ['food-drink'],
      itineraryStops: [
        {
          stopOrder: 1,
          title: 'Dong Xuan Market',
          description:
            'Meet your guide and start with a walk through the largest wholesale market in Hanoi to see local ingredients.',
          durationMinutes: 40,
          latitude: '21.0381',
          longitude: '105.8474',
        },
        {
          stopOrder: 2,
          title: 'Pho & Local Noodle Shop',
          description: 'Try a steaming bowl of pho or bun cha at a family-run eatery popular with locals.',
          durationMinutes: 45,
          latitude: '21.0355',
          longitude: '105.8465',
        },
        {
          stopOrder: 3,
          title: 'Old Quarter Street Food Alley',
          description:
            'Sample banh mi, spring rolls, and grilled skewers while learning about Hanoi’s street food culture.',
          durationMinutes: 60,
          latitude: '21.0342',
          longitude: '105.8489',
        },
        {
          stopOrder: 4,
          title: 'Hidden Café for Dessert & Egg Coffee',
          description:
            'End the night with Vietnamese desserts and signature egg coffee at a hidden upstairs café.',
          durationMinutes: 45,
          latitude: '21.0329',
          longitude: '105.8515',
        },
      ],
      media: [
        {
          url: 'https://images.unsplash.com/photo-1514517521153-1be72277b32e',
          altText: 'Hanoi street food vendor at night',
          sortOrder: 1,
          isCover: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1533777324565-a040eb52fac1',
          altText: 'Vietnamese street food dishes',
          sortOrder: 2,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1525755662778-989d0524087e',
          altText: 'Food tour group in Hanoi',
          sortOrder: 3,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
          altText: 'Close-up of Vietnamese noodle dish',
          sortOrder: 4,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
          altText: 'Street food table full of plates',
          sortOrder: 5,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1514996937319-344454492b37',
          altText: 'Tourists eating together at night market',
          sortOrder: 6,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
          altText: 'Busy food alley with neon lights',
          sortOrder: 7,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1572715376701-98568319fd0d',
          altText: 'Chef preparing Vietnamese street food',
          sortOrder: 8,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38',
          altText: 'Hands sharing street food dishes',
          sortOrder: 9,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
          altText: 'Variety of Vietnamese dishes on table',
          sortOrder: 10,
          isCover: false,
        },
      ],
      options: [
        {
          code: 'standard',
          title: 'Standard Tour',
          description: 'Guided food walk with 10+ tastings',
          isDefault: true,
          priceAdult: 35,
          priceChild: 20,
        },
      ],
    },
    {
      slug: 'ho-chi-minh-cu-chi-tunnels',
      title: 'Cu Chi Tunnels Half-Day Tour',
      shortDescription: 'Explore the legendary underground tunnel system used during the Vietnam War.',
      fullDescription:
        'Travel to the Cu Chi district and explore the incredible network of underground tunnels that played a crucial role during the Vietnam War. Crawl through sections of the original tunnels (widened for tourists), see booby traps, and learn about daily life underground. Your expert guide brings history to life with vivid storytelling.',
      cityId: hcmCity?.id,
      meetingPoint: 'District 1 — Ben Thanh Market pickup',
      latitude: '11.1427',
      longitude: '106.4617',
      durationMinutes: 300,
      maxGroupSize: 25,
      status: TourStatus.PUBLISHED,
      inventoryMode: InventoryMode.PER_DEPARTURE,
      highlights: ['Crawl through real tunnels', 'Learn wartime history', 'See original booby traps', 'Hotel pickup included'],
      includedItems: ['Air-conditioned transport', 'English-speaking guide', 'Entrance fees', 'Bottled water', 'Hotel pickup (District 1)'],
      excludedItems: ['Lunch', 'Tips', 'Shooting range (optional, extra cost)'],
      whatToBring: [
        'Comfortable walking shoes',
        'Modest clothing that covers shoulders and knees',
        'Hat and sunscreen',
        'Insect repellent',
      ],
      importantInfo: [
        'Some tunnel sections are narrow and may not be suitable for guests with claustrophobia.',
        'Hotel pickup is only available in central District 1; otherwise meet at the designated point.',
        'The shooting range is optional and paid directly at the site.',
      ],
      cancellationPolicy: { type: 'FREE', freeCancelHoursBefore: 48 },
      availableLanguages: ['English', 'Vietnamese'],
      allowPayLater: true,
      tagSlugs: ['best-seller', 'family-friendly'],
      categorySlugs: ['walking-tours'],
      itineraryStops: [
        {
          stopOrder: 1,
          title: 'Pickup in Central Saigon',
          description: 'Meet your guide and group at Ben Thanh Market or your hotel in District 1.',
          durationMinutes: 30,
          latitude: '10.7721',
          longitude: '106.6983',
        },
        {
          stopOrder: 2,
          title: 'Cu Chi Documentary & Introduction',
          description:
            'Watch a short documentary and learn about the history and construction of the Cu Chi tunnel network.',
          durationMinutes: 40,
          latitude: '11.1427',
          longitude: '106.4617',
        },
        {
          stopOrder: 3,
          title: 'Explore Tunnel Sections & Traps',
          description:
            'Walk around the forested area, see hidden trapdoors, and crawl through widened sections of the tunnels.',
          durationMinutes: 90,
          latitude: '11.1433',
          longitude: '106.4621',
        },
        {
          stopOrder: 4,
          title: 'Tapioca Tasting & Free Time',
          description:
            'Taste boiled cassava (a wartime staple) with sesame and peanuts before heading back to Saigon.',
          durationMinutes: 40,
          latitude: '11.1429',
          longitude: '106.4625',
        },
      ],
      media: [
        {
          url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c',
          altText: 'Cu Chi tunnels entrance in Vietnam',
          sortOrder: 1,
          isCover: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
          altText: 'Tour group listening to guide',
          sortOrder: 2,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba',
          altText: 'Path through forest near Cu Chi',
          sortOrder: 3,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1500534314211-0a25ddb20c6f',
          altText: 'Historic war exhibits in Vietnam',
          sortOrder: 4,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1496568816309-51d7c20e3b21',
          altText: 'Vietnamese countryside landscape',
          sortOrder: 5,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1526481280696-3b113a1c79ab',
          altText: 'Group walking through wartime site',
          sortOrder: 6,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1562071370-106145f2f10b',
          altText: 'Close-up of wartime artifacts on display',
          sortOrder: 7,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b',
          altText: 'Green jungle surrounding Cu Chi area',
          sortOrder: 8,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1500534314211-0a25ddb20c70',
          altText: 'Tunnel entrance hidden in the ground',
          sortOrder: 9,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1547041451-c086fb6c10c7',
          altText: 'Tourists learning history from local guide',
          sortOrder: 10,
          isCover: false,
        },
      ],
      options: [
        {
          code: 'group',
          title: 'Group Tour',
          description: 'Join a group with shared transport',
          isDefault: true,
          priceAdult: 30,
          priceChild: 18,
        },
        {
          code: 'private',
          title: 'Private Tour',
          description: 'Private vehicle and guide for your group',
          isDefault: false,
          priceAdult: 75,
          priceChild: 45,
        },
      ],
    },
    {
      slug: 'saigon-evening-food-tour-motorbike',
      title: 'Saigon Evening Food Tour by Motorbike',
      shortDescription: 'Hop on the back of a motorbike and eat your way through Saigon after dark.',
      fullDescription:
        'Experience Saigon like a local on this thrilling motorbike food tour. Your driver-guide weaves through the city\'s lively streets, stopping at 5 hidden eateries for banh xeo, com tam, che, and more. Feel the energy of the city at night while discovering dishes you won\'t find in tourist restaurants.',
      cityId: hcmCity?.id,
      meetingPoint: 'District 1 — Nguyen Hue Walking Street',
      latitude: '10.7731',
      longitude: '106.7030',
      durationMinutes: 240,
      maxGroupSize: 8,
      status: TourStatus.PUBLISHED,
      inventoryMode: InventoryMode.PER_DEPARTURE,
      highlights: ['Ride on a motorbike', '5 food stops', 'Night market visit', 'Local hidden gems'],
      includedItems: ['Motorbike with experienced driver', 'All food tastings', 'Helmet', 'Rain poncho (if needed)'],
      excludedItems: ['Drinks', 'Tips'],
      whatToBring: [
        'Closed-toe shoes or secure sandals',
        'Light jacket in case of wind or light rain',
        'Small crossbody bag; avoid large backpacks',
      ],
      importantInfo: [
        'Not recommended for guests uncomfortable on motorbikes.',
        'Children under 6 years old are not allowed for safety reasons.',
        'Helmets are provided and must be worn at all times during the ride.',
      ],
      cancellationPolicy: { type: 'FREE', freeCancelHoursBefore: 24 },
      availableLanguages: ['English', 'Vietnamese'],
      allowPayLater: true,
      tagSlugs: ['best-seller', 'small-group', 'local-guide'],
      categorySlugs: ['food-drink'],
      itineraryStops: [
        {
          stopOrder: 1,
          title: 'Nguyen Hue Walking Street',
          description:
            'Meet your driver-guide, receive a safety briefing, and hop on the back of your motorbike.',
          durationMinutes: 20,
          latitude: '10.7731',
          longitude: '106.7030',
        },
        {
          stopOrder: 2,
          title: 'Local Seafood & Grill Spot',
          description:
            'Sample grilled seafood, skewers, and Vietnamese pancakes at a busy evening spot popular with locals.',
          durationMinutes: 60,
          latitude: '10.7705',
          longitude: '106.6952',
        },
        {
          stopOrder: 3,
          title: 'Night Market & Dessert',
          description:
            'Walk through a night market, try Vietnamese desserts like che, and explore local shopping stalls.',
          durationMinutes: 60,
          latitude: '10.7718',
          longitude: '106.6989',
        },
        {
          stopOrder: 4,
          title: 'Rooftop Viewpoint',
          description:
            'Ride to a viewpoint overlooking the Saigon skyline before returning to the meeting point.',
          durationMinutes: 40,
          latitude: '10.7754',
          longitude: '106.7047',
        },
      ],
      media: [
        {
          url: 'https://images.unsplash.com/photo-1543248939-ff40856f65d4',
          altText: 'Motorbikes in Saigon at night',
          sortOrder: 1,
          isCover: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9',
          altText: 'Vietnamese street food and drinks',
          sortOrder: 2,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1542228262-3d663b306a53',
          altText: 'Saigon skyline and river at night',
          sortOrder: 3,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1453747063559-36695c8771bd',
          altText: 'Motorbike traffic in Ho Chi Minh City',
          sortOrder: 4,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1543508282-6319a3e2621f',
          altText: 'Friends enjoying food and drinks together',
          sortOrder: 5,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9',
          altText: 'Busy Vietnamese street with food stalls',
          sortOrder: 6,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1526788591856-3a6c18c4c36c',
          altText: 'Local guide talking to guests on motorbikes',
          sortOrder: 7,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1564758564527-9b1c0ed2c40f',
          altText: 'Close-up of Vietnamese dessert che',
          sortOrder: 8,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1520209268518-aec60b8bb0a5',
          altText: 'Evening street lights and food vendors',
          sortOrder: 9,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1513103581040-2f57aabed84c',
          altText: 'Tourist taking photos of Saigon food',
          sortOrder: 10,
          isCover: false,
        },
      ],
      options: [
        {
          code: 'standard',
          title: 'Motorbike Food Tour',
          description: 'Back of motorbike with local driver-guide',
          isDefault: true,
          priceAdult: 45,
          priceChild: 30,
        },
      ],
    },
    {
      slug: 'mekong-delta-day-trip',
      title: 'Mekong Delta Full-Day Tour from Saigon',
      shortDescription: 'Cruise through floating markets, sample tropical fruits, and visit local workshops.',
      fullDescription:
        'Escape the city for a full day exploring the lush Mekong Delta. Visit the vibrant Cai Be floating market, cruise along palm-lined canals, taste exotic tropical fruits, and visit a coconut candy workshop. Enjoy a traditional Vietnamese lunch on a shaded island before returning to Saigon.',
      cityId: hcmCity?.id,
      meetingPoint: 'District 1 — Hotel Pickup',
      latitude: '10.3517',
      longitude: '106.3600',
      durationMinutes: 540,
      maxGroupSize: 20,
      status: TourStatus.PUBLISHED,
      inventoryMode: InventoryMode.PER_DEPARTURE,
      highlights: ['Floating market visit', 'Tropical fruit tasting', 'Coconut candy workshop', 'Scenic boat cruise'],
      includedItems: ['AC transport', 'English guide', 'Boat cruise', 'Entrance fees', 'Vietnamese lunch', 'Hotel pickup (D1/D3)'],
      excludedItems: ['Tips', 'Personal expenses', 'Drinks'],
      whatToBring: [
        'Comfortable shoes or sandals',
        'Hat and sunglasses',
        'Sunscreen and insect repellent',
        'Cash for personal purchases at local workshops',
      ],
      importantInfo: [
        'Boat type may vary depending on water levels and group size.',
        'Vegetarian lunch option is available on request; please inform in advance.',
        'Tour may not be suitable for guests with severe motion sickness.',
      ],
      cancellationPolicy: { type: 'FREE', freeCancelHoursBefore: 48 },
      availableLanguages: ['English', 'Vietnamese'],
      allowPayLater: true,
      tagSlugs: ['family-friendly', 'local-guide'],
      categorySlugs: ['walking-tours'],
      itineraryStops: [
        {
          stopOrder: 1,
          title: 'Drive from Saigon to Mekong Delta',
          description:
            'Leave the city behind on a scenic drive to the Mekong Delta, with a short rest stop along the way.',
          durationMinutes: 90,
          latitude: '10.3517',
          longitude: '106.3600',
        },
        {
          stopOrder: 2,
          title: 'Cai Be Floating Market',
          description:
            'Board a boat to explore the colorful floating market where local traders sell fruit and goods from their boats.',
          durationMinutes: 60,
          latitude: '10.3220',
          longitude: '105.9995',
        },
        {
          stopOrder: 3,
          title: 'Island Lunch & Village Walk',
          description:
            'Enjoy a home-style Vietnamese lunch on a river island and walk through orchards and small villages.',
          durationMinutes: 120,
          latitude: '10.3255',
          longitude: '106.0132',
        },
        {
          stopOrder: 4,
          title: 'Canal Cruise & Coconut Workshop',
          description:
            'Cruise narrow canals in a small sampan boat and visit a coconut candy workshop with tastings.',
          durationMinutes: 90,
          latitude: '10.3299',
          longitude: '106.0176',
        },
      ],
      media: [
        {
          url: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2',
          altText: 'Boat on the Mekong River',
          sortOrder: 1,
          isCover: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1487730116645-74489c95b41b',
          altText: 'Tropical fruits at a Vietnamese market',
          sortOrder: 2,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1439405326854-014607f694d7',
          altText: 'Small boat on narrow Mekong canal',
          sortOrder: 3,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1453282716202-de94e528067c',
          altText: 'Palm trees along riverbank in Mekong Delta',
          sortOrder: 4,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
          altText: 'Tourists sitting on wooden boat',
          sortOrder: 5,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1498550744921-75f79806b8a7',
          altText: 'Local woman rowing boat on canal',
          sortOrder: 6,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1498550744291-1563a20e2e3f',
          altText: 'Traditional Vietnamese lunch dishes',
          sortOrder: 7,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1528838068496-2a0c8d27f9a0',
          altText: 'Coconut candy being made in workshop',
          sortOrder: 8,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1498553428362-34b21b4f1d9b',
          altText: 'Fruit tasting plate with tropical fruit',
          sortOrder: 9,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b',
          altText: 'Green rice fields and river in delta',
          sortOrder: 10,
          isCover: false,
        },
      ],
      options: [
        {
          code: 'group',
          title: 'Group Tour',
          description: 'Shared tour with lunch included',
          isDefault: true,
          priceAdult: 40,
          priceChild: 25,
        },
        {
          code: 'private',
          title: 'Private Tour',
          description: 'Private vehicle, boat, and guide',
          isDefault: false,
          priceAdult: 95,
          priceChild: 55,
        },
      ],
    },
    {
      slug: 'new-york-central-park-bike-tour',
      title: 'Central Park Bike Tour',
      shortDescription: 'Cycle through iconic Central Park landmarks with a fun, knowledgeable guide.',
      fullDescription:
        'See the best of Central Park on two wheels! This 2-hour guided bike tour covers all the major landmarks including Bethesda Fountain, Strawberry Fields, Bow Bridge, the Great Lawn, and more. Perfect for first-time visitors and families.',
      cityId: nyCity?.id,
      meetingPoint: 'Central Park South — Columbus Circle Entrance',
      latitude: '40.7681',
      longitude: '-73.9819',
      durationMinutes: 120,
      maxGroupSize: 15,
      status: nyCity ? TourStatus.PUBLISHED : TourStatus.DRAFT,
      inventoryMode: InventoryMode.PER_DEPARTURE,
      highlights: ['Bike rental included', 'See 15+ landmarks', 'Fun for all ages', 'Photo stops'],
      includedItems: ['Bike rental', 'Helmet', 'English-speaking guide', 'Route map'],
      excludedItems: ['Food & drinks', 'Tips'],
      whatToBring: [
        'Comfortable clothing suitable for cycling',
        'Closed-toe shoes',
        'Refillable water bottle',
      ],
      importantInfo: [
        'Riders must be able to comfortably ride a bicycle for 2 hours.',
        'Child seats and smaller bikes are available on request.',
        'Tour may be cancelled or rescheduled in case of severe weather.',
      ],
      cancellationPolicy: { type: 'FREE', freeCancelHoursBefore: 24 },
      availableLanguages: ['English'],
      allowPayLater: true,
      tagSlugs: ['family-friendly', 'small-group'],
      categorySlugs: ['walking-tours'],
      itineraryStops: [
        {
          stopOrder: 1,
          title: 'Columbus Circle & Park Entrance',
          description:
            'Meet your guide, get fitted for your bike and helmet, and enter Central Park from the south.',
          durationMinutes: 20,
          latitude: '40.7681',
          longitude: '-73.9819',
        },
        {
          stopOrder: 2,
          title: 'Bethesda Fountain & Terrace',
          description:
            'Stop for photos at one of the park’s most iconic landmarks overlooking the lake and arcade.',
          durationMinutes: 20,
          latitude: '40.7740',
          longitude: '-73.9700',
        },
        {
          stopOrder: 3,
          title: 'Strawberry Fields & Imagine Mosaic',
          description:
            'Visit the John Lennon memorial and learn about the history of the surrounding neighborhood.',
          durationMinutes: 20,
          latitude: '40.7756',
          longitude: '-73.9746',
        },
        {
          stopOrder: 4,
          title: 'Great Lawn & Belvedere Castle View',
          description:
            'Cycle past wide open fields and enjoy views of Belvedere Castle before looping back.',
          durationMinutes: 30,
          latitude: '40.7812',
          longitude: '-73.9665',
        },
      ],
      media: [
        {
          url: 'https://images.unsplash.com/photo-1421809313281-48f03fa45e9f',
          altText: 'Cyclists riding through Central Park',
          sortOrder: 1,
          isCover: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276',
          altText: 'Central Park lake and skyline view',
          sortOrder: 2,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
          altText: 'Autumn leaves in Central Park',
          sortOrder: 3,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1476357471311-43c0db9fb2b4',
          altText: 'Cyclist on road surrounded by trees',
          sortOrder: 4,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1516570161787-2fd917215a3d',
          altText: 'People relaxing on the Great Lawn',
          sortOrder: 5,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1500534314211-0a25ddb20c6f',
          altText: 'Bridge over lake in Central Park',
          sortOrder: 6,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1496958602275-4e2064c75b8e',
          altText: 'Bethesda Terrace and Fountain area',
          sortOrder: 7,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8',
          altText: 'Pathway with trees and sunlight',
          sortOrder: 8,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1500534314211-0a25ddb20c60',
          altText: 'View of Manhattan skyline from park',
          sortOrder: 9,
          isCover: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6f',
          altText: 'Cyclists stopping for photos in Central Park',
          sortOrder: 10,
          isCover: false,
        },
      ],
      options: [
        {
          code: 'standard',
          title: 'Group Bike Tour',
          description: 'Guided group cycling tour',
          isDefault: true,
          priceAdult: 49,
          priceChild: 29,
        },
      ],
    },
  ];

  // Date helpers for departure slots
  const today = new Date();
  const slotDays = 14; // Create slots for the next 14 days

  let tourCount = 0;

  for (const td of toursData) {
    if (!td.cityId) continue; // skip if city doesn't exist

    const tour = await prisma.tour.upsert({
      where: { slug: td.slug },
      update: {
        supplierId: supplier.id,
        cityId: td.cityId,
        title: td.title,
        shortDescription: td.shortDescription,
        fullDescription: td.fullDescription,
        meetingPoint: td.meetingPoint,
        latitude: td.latitude,
        longitude: td.longitude,
        durationMinutes: td.durationMinutes,
        maxGroupSize: td.maxGroupSize,
        status: td.status,
        inventoryMode: td.inventoryMode,
        highlights: td.highlights,
        includedItems: td.includedItems,
        excludedItems: td.excludedItems,
          whatToBring: td.whatToBring ?? [],
          importantInfo: td.importantInfo ?? [],
        cancellationPolicy: td.cancellationPolicy,
        availableLanguages: td.availableLanguages ?? [],
        allowPayLater: td.allowPayLater ?? false,
        publishedAt: td.status === TourStatus.PUBLISHED ? new Date() : null,
      },
      create: {
        supplierId: supplier.id,
        cityId: td.cityId,
        slug: td.slug,
        title: td.title,
        shortDescription: td.shortDescription,
        fullDescription: td.fullDescription,
        meetingPoint: td.meetingPoint,
        latitude: td.latitude,
        longitude: td.longitude,
        durationMinutes: td.durationMinutes,
        maxGroupSize: td.maxGroupSize,
        status: td.status,
        inventoryMode: td.inventoryMode,
        highlights: td.highlights,
        includedItems: td.includedItems,
        excludedItems: td.excludedItems,
          whatToBring: td.whatToBring ?? [],
          importantInfo: td.importantInfo ?? [],
        cancellationPolicy: td.cancellationPolicy,
        availableLanguages: td.availableLanguages ?? [],
        allowPayLater: td.allowPayLater ?? false,
        publishedAt: td.status === TourStatus.PUBLISHED ? new Date() : null,
      },
    });

    // Attach tour tags
    for (const tagSlug of td.tagSlugs || []) {
      const tagId = tourTagMap[tagSlug];
      if (tagId) {
        await prisma.tourTagMap.upsert({
          where: { tourId_tagId: { tourId: tour.id, tagId } },
          update: {},
          create: { tourId: tour.id, tagId },
        });
      }
    }

    // Attach tour categories
    for (const catSlug of td.categorySlugs || []) {
      const cat = { 'walking-tours': walkingCat, 'food-drink': foodCat, 'museum-tickets': museumCat }[catSlug];
      if (cat) {
        await prisma.tourCategory.upsert({
          where: { tourId_categoryId: { tourId: tour.id, categoryId: cat.id } },
          update: {},
          create: { tourId: tour.id, categoryId: cat.id },
        });
      }
    }

      // Itinerary stops – reset and recreate for deterministic seed
      if (td.itineraryStops?.length) {
        await prisma.tourItineraryStop.deleteMany({ where: { tourId: tour.id } });
        for (const stop of td.itineraryStops) {
          await prisma.tourItineraryStop.create({
            data: {
              tourId: tour.id,
              stopOrder: stop.stopOrder,
              title: stop.title,
              description: stop.description,
              durationMinutes: stop.durationMinutes,
              latitude: stop.latitude,
              longitude: stop.longitude,
            },
          });
        }
      }

      // Media – reset and recreate
      if (td.media?.length) {
        await prisma.tourMedia.deleteMany({ where: { tourId: tour.id } });
        for (const m of td.media) {
          await prisma.tourMedia.create({
            data: {
              tourId: tour.id,
              mediaType: MediaType.IMAGE,
              url: m.url,
              altText: m.altText,
              sortOrder: m.sortOrder ?? 0,
              isCover: m.isCover ?? false,
            },
          });
        }
      }

    // Create options, pricing rules, departure slots, and inventory
    for (const opt of td.options) {
      const tourOption = await prisma.tourOption.upsert({
        where: { tourId_code: { tourId: tour.id, code: opt.code } },
        update: {
          title: opt.title,
          description: opt.description,
          isDefault: opt.isDefault,
          isActive: true,
        },
        create: {
          tourId: tour.id,
          code: opt.code,
          title: opt.title,
          description: opt.description,
          isDefault: opt.isDefault,
          minParticipants: 1,
          maxParticipants: td.maxGroupSize,
          durationMinutes: td.durationMinutes,
          isActive: true,
        },
      });

      // Pricing rules — valid for the next year
      const validFrom = new Date();
      const validTo = new Date();
      validTo.setFullYear(validTo.getFullYear() + 1);

      // Adult pricing
      const existingAdultRule = await prisma.optionPricingRule.findFirst({
        where: { tourOptionId: tourOption.id, travelerType: 'adult', componentType: 'BASE' },
      });
      if (!existingAdultRule) {
        await prisma.optionPricingRule.create({
          data: {
            tourOptionId: tourOption.id,
            componentType: 'BASE',
            travelerType: 'adult',
            currencyCode: 'USD',
            amount: opt.priceAdult,
            validFrom,
            validTo,
          },
        });
      }

      // Child pricing
      const existingChildRule = await prisma.optionPricingRule.findFirst({
        where: { tourOptionId: tourOption.id, travelerType: 'child', componentType: 'BASE' },
      });
      if (!existingChildRule) {
        await prisma.optionPricingRule.create({
          data: {
            tourOptionId: tourOption.id,
            componentType: 'BASE',
            travelerType: 'child',
            currencyCode: 'USD',
            amount: opt.priceChild,
            validFrom,
            validTo,
          },
        });
      }

      // Departure slots — morning + afternoon for the next 14 days
      const slotTimes = ['09:00', '14:00'];
      for (let d = 1; d <= slotDays; d++) {
        for (const time of slotTimes) {
          const [h, m] = time.split(':').map(Number);
          const startsAt = new Date(today);
          startsAt.setDate(startsAt.getDate() + d);
          startsAt.setHours(h, m, 0, 0);

          const endsAt = new Date(startsAt);
          endsAt.setMinutes(endsAt.getMinutes() + td.durationMinutes);

          // Check if slot already exists
          const existingSlot = await prisma.departureSlot.findFirst({
            where: {
              tourOptionId: tourOption.id,
              startsAt,
            },
          });

          if (!existingSlot) {
            const slot = await prisma.departureSlot.create({
              data: {
                tourOptionId: tourOption.id,
                startsAt,
                endsAt,
                status: 'ACTIVE',
              },
            });

            // Inventory for each slot
            await prisma.inventorySlot.create({
              data: {
                departureSlotId: slot.id,
                totalCapacity: td.maxGroupSize,
                heldCapacity: 0,
                bookedCapacity: 0,
              },
            });
          }
        }
      }
    }

    tourCount++;
  }

  console.log(`  ✓ Tours: ${tourCount} tours with options, pricing, and ${slotDays * 2} departure slots each`);
}

async function main() {
  console.log('Seeding reference data...');
  await seedReferenceData();

  console.log('Seeding users & roles...');
  const usersByEmail = await seedUsersAndRoles();

  console.log('Seeding supplier mapping...');
  await seedSupplierMapping(usersByEmail);

  console.log('Seeding FAQ...');
  await seedFaq();

  console.log('Seeding blog...');
  await seedBlog(usersByEmail);

  console.log('Seeding tours...');
  await seedTours();

  console.log('\nSeed completed. Demo accounts:');
  console.log('- admin@getyourguide.local');
  console.log('- operator@getyourguide.local');
  console.log('- supplier.admin@getyourguide.local');
  console.log('- supplier.staff@getyourguide.local');
  console.log('- customer@getyourguide.local');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
