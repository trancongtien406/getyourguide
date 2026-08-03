import { PrismaPg } from '@prisma/adapter-pg';
import {
  BlogPostStatus,
  BookingStatus,
  ConversationStatus,
  ConversationType,
  CmsPageStatus,
  MediaType,
  MessageType,
  NotificationChannel,
  PayoutStatus,
  PaymentStatus,
  PrismaClient,
  PromoScope,
  PromoType,
  ReviewStatus,
  SupplierStatus,
  TourStatus,
  UserRole,
  UserStatus,
  InventoryMode,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
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
  {
    email: 'maria.garcia@example.com',
    firstName: 'Maria',
    lastName: 'Garcia',
    phoneE164: '+34900000006',
    status: UserStatus.ACTIVE,
    roles: [UserRole.CUSTOMER],
    password: 'Customer@12345',
  },
  {
    email: 'james.wilson@example.com',
    firstName: 'James',
    lastName: 'Wilson',
    phoneE164: '+44900000007',
    status: UserStatus.ACTIVE,
    roles: [UserRole.CUSTOMER],
    password: 'Customer@12345',
  },
  {
    email: 'yuki.tanaka@example.com',
    firstName: 'Yuki',
    lastName: 'Tanaka',
    phoneE164: '+81900000008',
    status: UserStatus.ACTIVE,
    roles: [UserRole.CUSTOMER],
    password: 'Customer@12345',
  },
  {
    email: 'sophie.martin@example.com',
    firstName: 'Sophie',
    lastName: 'Martin',
    phoneE164: '+33900000009',
    status: UserStatus.ACTIVE,
    roles: [UserRole.CUSTOMER],
    password: 'Customer@12345',
  },
  {
    email: 'lars.weber@example.com',
    firstName: 'Lars',
    lastName: 'Weber',
    phoneE164: '+49900000010',
    status: UserStatus.ACTIVE,
    roles: [UserRole.CUSTOMER],
    password: 'Customer@12345',
  },
];

async function seedReferenceData() {
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'es', name: 'Español' },
    { code: 'it', name: 'Italiano' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'zh', name: '中文' },
    { code: 'th', name: 'ไทย' },
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
    { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimals: 0 },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', decimals: 2 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', decimals: 2 },
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
    { iso2: 'VN', iso3: 'VNM', name: 'Vietnam', currencyCode: 'VND', imageUrl: 'https://flagcdn.com/w320/vn.png' },
    { iso2: 'US', iso3: 'USA', name: 'United States', currencyCode: 'USD', imageUrl: 'https://flagcdn.com/w320/us.png' },
    { iso2: 'FR', iso3: 'FRA', name: 'France', currencyCode: 'EUR', imageUrl: 'https://flagcdn.com/w320/fr.png' },
    { iso2: 'GB', iso3: 'GBR', name: 'United Kingdom', currencyCode: 'GBP', imageUrl: 'https://flagcdn.com/w320/gb.png' },
    { iso2: 'JP', iso3: 'JPN', name: 'Japan', currencyCode: 'JPY', imageUrl: 'https://flagcdn.com/w320/jp.png' },
    { iso2: 'KR', iso3: 'KOR', name: 'South Korea', currencyCode: 'KRW', imageUrl: 'https://flagcdn.com/w320/kr.png' },
    { iso2: 'TH', iso3: 'THA', name: 'Thailand', currencyCode: 'THB', imageUrl: 'https://flagcdn.com/w320/th.png' },
    { iso2: 'AU', iso3: 'AUS', name: 'Australia', currencyCode: 'AUD', imageUrl: 'https://flagcdn.com/w320/au.png' },
    { iso2: 'DE', iso3: 'DEU', name: 'Germany', currencyCode: 'EUR', imageUrl: 'https://flagcdn.com/w320/de.png' },
    { iso2: 'ES', iso3: 'ESP', name: 'Spain', currencyCode: 'EUR', imageUrl: 'https://flagcdn.com/w320/es.png' },
  ];

  for (const item of countries) {
    await prisma.country.upsert({
      where: { iso2: item.iso2 },
      update: {
        iso3: item.iso3,
        name: item.name,
        currencyCode: item.currencyCode,
        imageUrl: item.imageUrl ?? undefined,
      },
      create: {
        iso2: item.iso2,
        iso3: item.iso3,
        name: item.name,
        currencyCode: item.currencyCode,
        imageUrl: item.imageUrl ?? undefined,
      },
    });
  }

  const countryByIso2 = Object.fromEntries(
    (await prisma.country.findMany({ where: { iso2: { in: countries.map((x) => x.iso2) } } })).map(
      (item) => [item.iso2, item],
    ),
  );

  const cities = [
    { countryIso2: 'VN', name: 'Hà Nội', normalizedName: 'ha-noi', latitude: '21.027763', longitude: '105.834160', timezone: 'Asia/Ho_Chi_Minh', imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800' },
    { countryIso2: 'VN', name: 'Hồ Chí Minh', normalizedName: 'ho-chi-minh', latitude: '10.823099', longitude: '106.629662', timezone: 'Asia/Ho_Chi_Minh', imageUrl: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800' },
    { countryIso2: 'VN', name: 'Đà Nẵng', normalizedName: 'da-nang', latitude: '16.054407', longitude: '108.202164', timezone: 'Asia/Ho_Chi_Minh', imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800' },
    { countryIso2: 'US', name: 'New York', normalizedName: 'new-york', latitude: '40.712776', longitude: '-74.005974', timezone: 'America/New_York', imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800' },
    { countryIso2: 'US', name: 'Los Angeles', normalizedName: 'los-angeles', latitude: '34.052235', longitude: '-118.243683', timezone: 'America/Los_Angeles', imageUrl: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800' },
    { countryIso2: 'FR', name: 'Paris', normalizedName: 'paris', latitude: '48.856614', longitude: '2.352222', timezone: 'Europe/Paris', imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800' },
    { countryIso2: 'GB', name: 'London', normalizedName: 'london', latitude: '51.507351', longitude: '-0.127758', timezone: 'Europe/London', imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800' },
    { countryIso2: 'JP', name: 'Tokyo', normalizedName: 'tokyo', latitude: '35.676192', longitude: '139.650311', timezone: 'Asia/Tokyo', imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800' },
    { countryIso2: 'TH', name: 'Bangkok', normalizedName: 'bangkok', latitude: '13.756331', longitude: '100.501762', timezone: 'Asia/Bangkok', imageUrl: 'https://images.unsplash.com/photo-1508009603885-027cf6ddb6e0?w=800' },
    { countryIso2: 'AU', name: 'Sydney', normalizedName: 'sydney', latitude: '-33.868820', longitude: '151.209296', timezone: 'Australia/Sydney', imageUrl: 'https://images.unsplash.com/photo-1523482580671-f216095fbba2?w=800' },
  ];

  const cityIdsByNorm = {};
  for (const item of cities) {
    const country = countryByIso2[item.countryIso2];
    if (!country) continue;
    const city = await prisma.city.upsert({
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
        imageUrl: item.imageUrl ?? undefined,
      },
      create: {
        countryId: country.id,
        name: item.name,
        normalizedName: item.normalizedName,
        latitude: item.latitude,
        longitude: item.longitude,
        timezone: item.timezone,
        imageUrl: item.imageUrl ?? undefined,
      },
    });
    cityIdsByNorm[item.normalizedName] = city.id;
  }

  // Country translations (en, vi, fr)
  const countryNamesVi = { VN: 'Việt Nam', US: 'Hoa Kỳ', FR: 'Pháp', GB: 'Vương quốc Anh', JP: 'Nhật Bản', KR: 'Hàn Quốc', TH: 'Thái Lan', AU: 'Úc', DE: 'Đức', ES: 'Tây Ban Nha' };
  const countryNamesFr = { VN: 'Vietnam', US: 'États-Unis', GB: 'Royaume-Uni', JP: 'Japon', KR: 'Corée du Sud', TH: 'Thaïlande', AU: 'Australie', DE: 'Allemagne', ES: 'Espagne' };
  for (const c of countries) {
    const row = await prisma.country.findUnique({ where: { iso2: c.iso2 } });
    if (!row) continue;
    for (const lang of ['en', 'vi', 'fr']) {
      const name = lang === 'vi' && countryNamesVi[c.iso2] ? countryNamesVi[c.iso2] : lang === 'fr' && countryNamesFr[c.iso2] ? countryNamesFr[c.iso2] : c.name;
      await prisma.countryTranslation.upsert({
        where: { countryId_languageCode: { countryId: row.id, languageCode: lang } },
        update: { name },
        create: { countryId: row.id, languageCode: lang, name },
      });
    }
  }

  // City translations (en, vi, fr)
  const cityNamesVi = {
    'ha-noi': 'Hà Nội', 'ho-chi-minh': 'Hồ Chí Minh', 'da-nang': 'Đà Nẵng', 'new-york': 'New York',
    'los-angeles': 'Los Angeles', 'paris': 'Paris', 'london': 'London', 'tokyo': 'Tokyo',
    'bangkok': 'Băng Cốc', 'sydney': 'Sydney',
  };
  const cityNamesFr = {
    'ha-noi': 'Hanoï', 'ho-chi-minh': 'Ho Chi Minh-Ville', 'da-nang': 'Da Nang', 'new-york': 'New York',
    'los-angeles': 'Los Angeles', 'paris': 'Paris', 'london': 'Londres', 'tokyo': 'Tokyo',
    'bangkok': 'Bangkok', 'sydney': 'Sydney',
  };
  for (const item of cities) {
    const cityId = cityIdsByNorm[item.normalizedName];
    if (!cityId) continue;
    for (const lang of ['en', 'vi', 'fr']) {
      const name = lang === 'vi' && cityNamesVi[item.normalizedName] ? cityNamesVi[item.normalizedName] : lang === 'fr' && cityNamesFr[item.normalizedName] ? cityNamesFr[item.normalizedName] : item.name;
      await prisma.cityTranslation.upsert({
        where: { cityId_languageCode: { cityId, languageCode: lang } },
        update: { name },
        create: { cityId, languageCode: lang, name },
      });
    }
  }

  const categories = [
    { slug: 'walking-tours', name: 'Walking Tours', sortOrder: 10, descriptionEn: 'Guided walking tours through city streets, historic districts, and landmarks.', descriptionVi: 'Tour đi bộ có hướng dẫn qua phố phường, khu phố cổ và địa danh.' },
    { slug: 'food-drink', name: 'Food & Drink', sortOrder: 20, descriptionEn: 'Local food tours, cooking classes, and culinary experiences.', descriptionVi: 'Tour ẩm thực, lớp nấu ăn và trải nghiệm ẩm thực địa phương.' },
    { slug: 'museum-tickets', name: 'Museum Tickets', sortOrder: 30, descriptionEn: 'Skip-the-line museum tickets and guided museum tours.', descriptionVi: 'Vé bảo tàng ưu tiên và tour bảo tàng có hướng dẫn.' },
    { slug: 'day-trips', name: 'Day Trips', sortOrder: 40, descriptionEn: 'Full-day and half-day excursions from the city.', descriptionVi: 'Du lịch nửa ngày hoặc cả ngày từ thành phố.' },
    { slug: 'night-tours', name: 'Night Tours', sortOrder: 50, descriptionEn: 'Evening and night tours to see the city after dark.', descriptionVi: 'Tour buổi tối và đêm khám phá thành phố về đêm.' },
    { slug: 'cultural-experiences', name: 'Cultural Experiences', sortOrder: 60, descriptionEn: 'Traditional performances, workshops, and local culture immersion.', descriptionVi: 'Biểu diễn truyền thống, workshop và trải nghiệm văn hóa địa phương.' },
    { slug: 'adventure', name: 'Adventure', sortOrder: 70, descriptionEn: 'Hiking, zip-lining, outdoor adventures and adrenaline activities.', descriptionVi: 'Leo núi, zipline, hoạt động ngoài trời và mạo hiểm.' },
    { slug: 'water-activities', name: 'Water Activities', sortOrder: 80, descriptionEn: 'Boat cruises, kayaking, snorkeling, and water sports.', descriptionVi: 'Du thuyền, chèo kayak, lặn biển và thể thao dưới nước.' },
    { slug: 'cycling', name: 'Cycling', sortOrder: 90, descriptionEn: 'Bike tours and cycling experiences in the city or countryside.', descriptionVi: 'Tour xe đạp trong thành phố hoặc vùng nông thôn.' },
    { slug: 'cooking-classes', name: 'Cooking Classes', sortOrder: 100, descriptionEn: 'Hands-on cooking classes to learn local recipes and techniques.', descriptionVi: 'Lớp học nấu ăn thực hành học món địa phương.' },
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

  const categoryNamesVi = {
    'walking-tours': 'Tour đi bộ',
    'food-drink': 'Ẩm thực & Đồ uống',
    'museum-tickets': 'Vé bảo tàng',
    'day-trips': 'Du lịch trong ngày',
    'night-tours': 'Tour đêm',
    'cultural-experiences': 'Trải nghiệm văn hóa',
    'adventure': 'Phiêu lưu',
    'water-activities': 'Hoạt động dưới nước',
    'cycling': 'Đạp xe',
    'cooking-classes': 'Lớp học nấu ăn',
  };
  const allCats = await prisma.category.findMany();
  for (const cat of allCats) {
    const item = categories.find((c) => c.slug === cat.slug);
    const descEn = item?.descriptionEn ?? null;
    const descVi = item?.descriptionVi ?? null;
    for (const lang of ['en', 'vi']) {
      const name = lang === 'vi' && categoryNamesVi[cat.slug] ? categoryNamesVi[cat.slug] : cat.name;
      const description = lang === 'en' ? descEn : descVi;
      await prisma.categoryTranslation.upsert({
        where: { categoryId_languageCode: { categoryId: cat.id, languageCode: lang } },
        update: { name, description: description ?? undefined },
        create: { categoryId: cat.id, languageCode: lang, name, description: description ?? undefined },
      });
    }
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

  const moreRates = [
    { base: 'GBP', quote: 'USD', rate: '1.27' },
    { base: 'USD', quote: 'JPY', rate: '149.50' },
    { base: 'USD', quote: 'THB', rate: '35.20' },
    { base: 'USD', quote: 'AUD', rate: '1.53' },
    { base: 'EUR', quote: 'USD', rate: '1.08' },
    { base: 'USD', quote: 'KRW', rate: '1320' },
    { base: 'USD', quote: 'CAD', rate: '1.36' },
    { base: 'USD', quote: 'CHF', rate: '0.88' },
    { base: 'EUR', quote: 'GBP', rate: '0.85' },
    { base: 'VND', quote: 'USD', rate: '0.00004' },
  ];
  for (const r of moreRates) {
    await prisma.exchangeRate.upsert({
      where: {
        baseCurrency_quoteCurrency_effectiveAt: {
          baseCurrency: r.base,
          quoteCurrency: r.quote,
          effectiveAt: REFERENCE_EFFECTIVE_AT,
        },
      },
      update: { rate: r.rate },
      create: {
        baseCurrency: r.base,
        quoteCurrency: r.quote,
        rate: r.rate,
        effectiveAt: REFERENCE_EFFECTIVE_AT,
      },
    });
  }

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

  const extraSettings = [
    { key: 'platform.defaultLanguage', value: 'en', desc: 'Default site language' },
    { key: 'platform.maxCartAgeHours', value: '24', desc: 'Cart expiration in hours' },
    { key: 'platform.bookingConfirmationWindowMinutes', value: '30', desc: 'Minutes to pay before slot release' },
    { key: 'platform.maintenanceMode', value: 'false', desc: 'Enable maintenance mode' },
    { key: 'platform.allowGuestCheckout', value: 'true', desc: 'Allow checkout without account' },
    { key: 'platform.reviewModeration', value: 'auto', desc: 'auto|manual review moderation' },
    { key: 'platform.footerCopyright', value: '© 2026 GetYourGuide Demo', desc: 'Footer copyright text' },
    { key: 'platform.socialFacebook', value: 'https://facebook.com/getyourguide', desc: 'Facebook URL' },
    { key: 'platform.socialInstagram', value: 'https://instagram.com/getyourguide', desc: 'Instagram URL' },
  ];
  for (const s of extraSettings) {
    await prisma.systemSetting.upsert({
      where: { settingKey: s.key },
      update: { settingValue: s.value, valueType: 'string', isPublic: true, description: s.desc },
      create: { settingKey: s.key, settingValue: s.value, valueType: 'string', isPublic: true, description: s.desc },
    });
  }
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
  const suppliersData = [
    { slug: 'demo-supplier', legalName: 'Demo Supplier LLC', displayName: 'Demo Supplier', email: 'supplier@getyourguide.local', phoneE164: '+84900000100', addressLine: '1 Demo Street' },
    { slug: 'hanoi-tours-co', legalName: 'Hanoi Tours Co.', displayName: 'Hanoi Tours', email: 'contact@hanoitours.vn', phoneE164: '+84240000001', addressLine: '12 Hoan Kiem, Hanoi' },
    { slug: 'saigon-adventures', legalName: 'Saigon Adventures Ltd', displayName: 'Saigon Adventures', email: 'hello@saigonadventures.vn', phoneE164: '+84280000002', addressLine: '88 Nguyen Hue, District 1' },
    { slug: 'mekong-experience', legalName: 'Mekong Experience JSC', displayName: 'Mekong Experience', email: 'info@mekongexp.com', phoneE164: '+84280000003', addressLine: 'Can Tho City' },
    { slug: 'vietnam-food-tours', legalName: 'Vietnam Food Tours', displayName: 'Vietnam Food Tours', email: 'tours@vnfoodtours.com', phoneE164: '+84240000004', addressLine: 'Hanoi & HCMC' },
    { slug: 'asia-discovery', legalName: 'Asia Discovery Travel', displayName: 'Asia Discovery', email: 'book@asiadiscovery.com', phoneE164: '+6620000001', addressLine: 'Bangkok, Thailand' },
    { slug: 'europe-walks', legalName: 'Europe Walks GmbH', displayName: 'Europe Walks', email: 'info@europewalks.com', phoneE164: '+4930000001', addressLine: 'Berlin, Germany' },
    { slug: 'city-explorers', legalName: 'City Explorers Inc', displayName: 'City Explorers', email: 'support@cityexplorers.com', phoneE164: '+12120000001', addressLine: 'New York, USA' },
    { slug: 'cultural-journeys', legalName: 'Cultural Journeys SAS', displayName: 'Cultural Journeys', email: 'contact@culturaljourneys.fr', phoneE164: '+33100000001', addressLine: 'Paris, France' },
    { slug: 'sunrise-tours', legalName: 'Sunrise Tours Pty Ltd', displayName: 'Sunrise Tours', email: 'hello@sunrisetours.com.au', phoneE164: '+61200000001', addressLine: 'Sydney, Australia' },
  ];

  let firstSupplierId = null;
  for (const s of suppliersData) {
    const supplier = await prisma.supplier.upsert({
      where: { slug: s.slug },
      update: {
        legalName: s.legalName,
        displayName: s.displayName,
        status: SupplierStatus.ACTIVE,
        email: s.email,
        phoneE164: s.phoneE164,
        addressLine: s.addressLine,
      },
      create: {
        legalName: s.legalName,
        displayName: s.displayName,
        slug: s.slug,
        status: SupplierStatus.ACTIVE,
        email: s.email,
        phoneE164: s.phoneE164,
        addressLine: s.addressLine,
      },
    });
    if (!firstSupplierId) firstSupplierId = supplier.id;
  }

  const supplier = await prisma.supplier.findUnique({ where: { slug: 'demo-supplier' } });
  if (!supplier) return;

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
    { slug: 'vouchers-tickets', name: 'Vouchers & Tickets', sortOrder: 60 },
    { slug: 'safety-health', name: 'Safety & Health', sortOrder: 70 },
    { slug: 'accessibility', name: 'Accessibility', sortOrder: 80 },
    { slug: 'group-corporate', name: 'Groups & Corporate', sortOrder: 90 },
    { slug: 'contact-support', name: 'Contact & Support', sortOrder: 100 },
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
    { slug: 'voucher-format', categorySlug: 'vouchers-tickets', question: 'In what format will I receive my voucher?', answer: 'You receive a PDF voucher by email. You can also access it in "My Bookings" and show the digital voucher on your phone to the guide.', sortOrder: 10 },
    { slug: 'voucher-lost', categorySlug: 'vouchers-tickets', question: 'I lost my voucher. What do I do?', answer: 'Log in to your account, go to "My Bookings", and download or view your voucher again. You can also contact support with your booking reference.', sortOrder: 20 },
    { slug: 'safety-measures', categorySlug: 'safety-health', question: 'What safety measures do tours follow?', answer: 'All our suppliers follow local health and safety guidelines. Equipment is regularly maintained. Your guide will brief you on any specific safety rules.', sortOrder: 10 },
    { slug: 'accessibility-options', categorySlug: 'accessibility', question: 'Do you have tours for guests with reduced mobility?', answer: 'Many tours are wheelchair-friendly or can be adapted. Check the "Important information" section on each tour page or contact us to confirm.', sortOrder: 10 },
    { slug: 'group-booking', categorySlug: 'group-corporate', question: 'How do I book for a large group?', answer: 'For groups of 10 or more, use the group enquiry form or contact our team. We can arrange private tours and group discounts.', sortOrder: 10 },
    { slug: 'contact-hours', categorySlug: 'contact-support', question: 'What are your support opening hours?', answer: 'Our support team is available 24/7 by email. Live chat is available during business hours in your timezone.', sortOrder: 10 },
    { slug: 'change-booking-date', categorySlug: 'booking', question: 'Can I change my tour date?', answer: 'Date changes depend on the tour\'s policy. Go to "My Bookings" and use "Change date" if available, or contact support.', sortOrder: 40 },
  ];

  for (const item of faqItems) {
    const categoryId = categoryMap[item.categorySlug] || null;
    const faqRecord = await prisma.supportFaqItem.upsert({
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

  for (const cat of faqCategories) {
    const rec = await prisma.supportFaqCategory.findUnique({ where: { slug: cat.slug } });
    if (rec) {
      await prisma.supportFaqCategoryTranslation.upsert({
        where: { categoryId_languageCode: { categoryId: rec.id, languageCode: 'vi' } },
        update: { name: cat.name },
        create: { categoryId: rec.id, languageCode: 'vi', name: cat.name },
      });
    }
  }

  const faqItemList = await prisma.supportFaqItem.findMany({ take: 5 });
  for (const item of faqItemList) {
    await prisma.supportFaqItemTranslation.upsert({
      where: { itemId_languageCode: { itemId: item.id, languageCode: 'vi' } },
      update: { question: item.question, answer: item.answer },
      create: { itemId: item.id, languageCode: 'vi', question: item.question, answer: item.answer },
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
    { slug: 'family-travel', name: 'Family Travel', description: 'Trips and tips for traveling with kids', sortOrder: 50 },
    { slug: 'solo-travel', name: 'Solo Travel', description: 'Stories and advice for solo explorers', sortOrder: 60 },
    { slug: 'luxury-experiences', name: 'Luxury Experiences', description: 'Premium tours and exclusive experiences', sortOrder: 70 },
    { slug: 'sustainable-travel', name: 'Sustainable Travel', description: 'Eco-friendly and responsible tourism', sortOrder: 80 },
    { slug: 'seasonal-guides', name: 'Seasonal Guides', description: 'Best times to visit and seasonal events', sortOrder: 90 },
    { slug: 'travel-tech', name: 'Travel & Tech', description: 'Apps, gear, and digital nomad tips', sortOrder: 100 },
  ];

  const blogCategoryMap = {};

  for (const cat of blogCategories) {
    const record = await prisma.blogCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder, isActive: true },
      create: { slug: cat.slug, name: cat.name, description: cat.description, sortOrder: cat.sortOrder, isActive: true },
    });
    blogCategoryMap[cat.slug] = record.id;
    await prisma.blogCategoryTranslation.upsert({
      where: { categoryId_languageCode: { categoryId: record.id, languageCode: 'vi' } },
      update: { name: cat.name, description: cat.description },
      create: { categoryId: record.id, languageCode: 'vi', name: cat.name, description: cat.description },
    }).catch(() => {});
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
    { slug: 'southeast-asia', name: 'Southeast Asia' },
    { slug: 'weekend-getaway', name: 'Weekend Getaway' },
  ];

  const blogTagMap = {};

  for (const tag of blogTags) {
    const record = await prisma.blogTag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: { slug: tag.slug, name: tag.name },
    });
    blogTagMap[tag.slug] = record.id;
    await prisma.blogTagTranslation.upsert({
      where: { tagId_languageCode: { tagId: record.id, languageCode: 'vi' } },
      update: { name: tag.name },
      create: { tagId: record.id, languageCode: 'vi', name: tag.name },
    }).catch(() => {});
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
    {
      slug: 'solo-travel-vietnam-guide',
      title: 'Solo Travel in Vietnam: A Complete Guide',
      excerpt: 'Everything you need to know for a safe, fun, and rewarding solo trip across Vietnam.',
      content: `# Solo Travel in Vietnam: A Complete Guide\n\nVietnam is one of the best destinations for solo travelers. Friendly locals, affordable transport, and a well-trodden backpacker trail make it easy and rewarding.\n\n## Safety tips\n- Keep valuables in a money belt or locked bag.\n- Use Grab for transport; avoid unlicensed taxis.\n- Stay in well-reviewed hostels and guesthouses.\n\n## Best routes\n- North to south (or vice versa) over 2–3 weeks.\n- Hanoi → Ha Long → Ninh Binh → Hue → Hoi An → Da Lat → HCMC.\n\n## Making friends\n- Join group tours and food tours.\n- Hostel common areas and overnight buses are great for meeting other travelers.\n\n*Book small-group tours for the perfect balance of independence and company.*`,
      categorySlug: 'solo-travel',
      tagSlugs: ['vietnam', 'first-time'],
      status: BlogPostStatus.PUBLISHED,
      isFeatured: false,
      seoTitle: 'Solo Travel Vietnam Guide 2026',
      seoDescription: 'Solo travel in Vietnam: safety, routes, and how to meet other travelers.',
      readTimeMinutes: 5,
    },
    {
      slug: 'best-time-visit-southeast-asia',
      title: 'Best Time to Visit Southeast Asia',
      excerpt: 'Weather, crowds, and festivals: when to go to Vietnam, Thailand, and beyond.',
      content: `# Best Time to Visit Southeast Asia\n\nSoutheast Asia has two main seasons: dry and wet. Timing your trip can save money and improve your experience.\n\n## Vietnam\n- **North:** Oct–Apr cool/dry; May–Sep hot and rainy.\n- **South:** Dec–Apr dry; May–Nov rainy (short, heavy showers).\n\n## Thailand\n- **Nov–Feb:** Cool and dry, peak season.\n- **Mar–May:** Very hot.\n- **Jun–Oct:** Rainy season, fewer tourists.\n\n## General tips\n- Shoulder season (Apr–May, Sep–Oct) often has good weather and lower prices.\n- Check local festivals (Tet, Songkran) for culture or to avoid peak demand.\n\n*Browse tours by month to see what\'s available when you travel.*`,
      categorySlug: 'seasonal-guides',
      tagSlugs: ['southeast-asia'],
      status: BlogPostStatus.PUBLISHED,
      isFeatured: false,
      seoTitle: 'Best Time to Visit Southeast Asia 2026',
      seoDescription: 'When to go to Vietnam, Thailand, and more: weather and seasons.',
      readTimeMinutes: 4,
    },
    {
      slug: 'eco-friendly-tours-how-to-choose',
      title: 'How to Choose Eco-Friendly Tours',
      excerpt: 'What to look for when booking sustainable and responsible tours.',
      content: `# How to Choose Eco-Friendly Tours\n\nMore travelers want to minimize their impact. Here\'s how to pick tours that walk the talk.\n\n## What to look for\n- Small groups (less impact, better experience).\n- Local guides and operators (money stays in the community).\n- Clear policies on waste, wildlife, and resources.\n- Certifications (e.g. Green Globe, local eco labels) where available.\n\n## Questions to ask\n- Is single-use plastic avoided?\n- How are wildlife interactions managed?\n- Does the operator support local conservation or community projects?\n\n## Our commitment\nWe work with suppliers who follow responsible practices and highlight eco-friendly options where possible.\n\n*Filter by "Eco-friendly" or "Small group" to find better options.*`,
      categorySlug: 'sustainable-travel',
      tagSlugs: ['southeast-asia'],
      status: BlogPostStatus.PUBLISHED,
      isFeatured: false,
      seoTitle: 'How to Choose Eco-Friendly Tours 2026',
      seoDescription: 'Tips for choosing sustainable and responsible tours.',
      readTimeMinutes: 4,
    },
    {
      slug: 'luxury-experiences-vietnam',
      title: 'Luxury Experiences in Vietnam',
      excerpt: 'Private cruises, top hotels, and exclusive experiences for a premium Vietnam trip.',
      content: `# Luxury Experiences in Vietnam\n\nVietnam offers world-class luxury without the European price tag. From Ha Long Bay cruises to private food tours.\n\n## Ha Long Bay\n- Overnight cruises on boutique junks with suites and fine dining.\n- Kayaking and cave visits with fewer crowds on premium boats.\n\n## Food & culture\n- Private cooking classes in restored villas.\n- Street food tours in a vintage car or with a dedicated chef.\n\n## Accommodation\n- Heritage hotels in Hanoi and Hoi An.\n- Beach resorts in Da Nang and Nha Trang.\n\n*Filter by "Private" or "Luxury" to see premium options.*`,
      categorySlug: 'luxury-experiences',
      tagSlugs: ['vietnam'],
      status: BlogPostStatus.PUBLISHED,
      isFeatured: false,
      seoTitle: 'Luxury Experiences Vietnam 2026',
      seoDescription: 'Luxury tours and experiences in Vietnam: cruises, food, and stays.',
      readTimeMinutes: 4,
    },
    {
      slug: 'apps-tools-every-traveler-needs',
      title: '10 Apps and Tools Every Traveler Needs',
      excerpt: 'From booking to navigation and translation: the best apps for your next trip.',
      content: `# 10 Apps and Tools Every Traveler Needs\n\n1. **Booking & tours** — GetYourGuide or similar for activities and skip-the-line tickets.\n2. **Maps** — Google Maps (offline), Maps.me for hiking.\n3. **Translation** — Google Translate (offline packs).\n4. **Rides** — Grab in SEA, Uber/Lyft elsewhere.\n5. **Money** — Wise or Revolut for exchange and payments.\n6. **Flights** — Skyscanner, Google Flights.\n7. **Accommodation** — Booking.com, Hostelworld.\n8. **Communication** — WhatsApp, local SIM or eSIM.\n9. **Health** — First aid, travel insurance app.\n10. **Notes** — Notion or Google Keep for itineraries.\n\n*Book your tours in one place and keep vouchers in our app.*`,
      categorySlug: 'travel-tech',
      tagSlugs: ['first-time'],
      status: BlogPostStatus.PUBLISHED,
      isFeatured: false,
      seoTitle: '10 Apps Every Traveler Needs 2026',
      seoDescription: 'Best travel apps for booking, maps, translation, and more.',
      readTimeMinutes: 3,
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

  const blogPostsForVi = await prisma.blogPost.findMany({ take: 3 });
  for (const post of blogPostsForVi) {
    await prisma.blogPostTranslation.upsert({
      where: { postId_languageCode: { postId: post.id, languageCode: 'vi' } },
      update: { title: post.title, excerpt: post.excerpt, content: post.content },
      create: { postId: post.id, languageCode: 'vi', title: post.title, excerpt: post.excerpt, content: post.content },
    }).catch(() => {});
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
  const allCategories = await prisma.category.findMany();
  const categoryBySlug = Object.fromEntries(allCategories.map((c) => [c.slug, c]));

  // Tour tags
  const tourTags = [
    { slug: 'best-seller', name: 'Best Seller' },
    { slug: 'skip-the-line', name: 'Skip the Line' },
    { slug: 'small-group', name: 'Small Group' },
    { slug: 'private-tour', name: 'Private Tour' },
    { slug: 'family-friendly', name: 'Family Friendly' },
    { slug: 'local-guide', name: 'Local Guide' },
    { slug: 'eco-friendly', name: 'Eco-Friendly' },
    { slug: 'wheelchair-accessible', name: 'Wheelchair Accessible' },
    { slug: 'romantic', name: 'Romantic' },
    { slug: 'sunset', name: 'Sunset' },
  ];

  const tourTagMap = {};
  for (const tag of tourTags) {
    const record = await prisma.tourTag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: { slug: tag.slug, name: tag.name },
    });
    tourTagMap[tag.slug] = record.id;
    for (const lang of ['en', 'vi']) {
      const nameVi = { 'best-seller': 'Bán chạy', 'skip-the-line': 'Vào cửa ưu tiên', 'small-group': 'Nhóm nhỏ', 'private-tour': 'Tour riêng', 'family-friendly': 'Gia đình', 'local-guide': 'Hướng dẫn địa phương', 'eco-friendly': 'Thân thiện môi trường', 'wheelchair-accessible': 'Xe lăn', 'romantic': 'Lãng mạn', 'sunset': 'Hoàng hôn' }[tag.slug];
      await prisma.tourTagTranslation.upsert({
        where: { tagId_languageCode: { tagId: record.id, languageCode: lang } },
        update: { name: lang === 'vi' && nameVi ? nameVi : tag.name },
        create: { tagId: record.id, languageCode: lang, name: lang === 'vi' && nameVi ? nameVi : tag.name },
      });
    }
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
    {
      slug: 'da-nang-marble-mountains-tour',
      title: 'Marble Mountains & Son Tra Peninsula Tour',
      shortDescription: 'Explore Buddhist caves, pagodas, and the Linh Ung Pagoda with the Lady Buddha.',
      fullDescription:
        'Discover the five marble hills of Da Nang, each named after an element. Climb steps to caves, pagodas, and viewpoints. Then visit Son Tra Peninsula and the stunning Linh Ung Pagoda with its 67m-tall Lady Buddha overlooking the coast.',
      cityId: cityByNorm['da-nang']?.id,
      meetingPoint: 'Da Nang city center — hotel pickup available',
      latitude: '15.9900',
      longitude: '108.2520',
      durationMinutes: 300,
      maxGroupSize: 12,
      status: TourStatus.PUBLISHED,
      inventoryMode: InventoryMode.PER_DEPARTURE,
      highlights: ['Marble Mountains caves', 'Linh Ung Pagoda', 'Lady Buddha', 'Panoramic views'],
      includedItems: ['Transport', 'English guide', 'Entrance fees', 'Bottled water'],
      excludedItems: ['Lunch', 'Tips'],
      whatToBring: ['Comfortable shoes', 'Hat', 'Sunscreen'],
      importantInfo: ['Some steep steps; moderate fitness required.'],
      cancellationPolicy: { type: 'FREE', freeCancelHoursBefore: 24 },
      availableLanguages: ['English', 'Vietnamese'],
      allowPayLater: true,
      tagSlugs: ['small-group', 'local-guide', 'eco-friendly'],
      categorySlugs: ['day-trips', 'cultural-experiences'],
      itineraryStops: [
        { stopOrder: 1, title: 'Marble Mountains', description: 'Explore caves and pagodas in the five hills.', durationMinutes: 120, latitude: '15.9950', longitude: '108.2650' },
        { stopOrder: 2, title: 'Son Tra Peninsula', description: 'Drive to Son Tra and visit Linh Ung Pagoda.', durationMinutes: 90, latitude: '16.0900', longitude: '108.2800' },
      ],
      media: [
        { url: 'https://images.unsplash.com/photo-1528181304800-259b08848526', altText: 'Marble Mountains view', sortOrder: 1, isCover: true },
        { url: 'https://images.unsplash.com/photo-1548013146-72479768bada', altText: 'Buddhist pagoda', sortOrder: 2, isCover: false },
      ],
      options: [{ code: 'group', title: 'Group Tour', description: 'Shared tour', isDefault: true, priceAdult: 35, priceChild: 20 }],
    },
    {
      slug: 'bangkok-temples-grand-palace',
      title: 'Bangkok Temples & Grand Palace Tour',
      shortDescription: 'Visit the Grand Palace, Wat Pho, and Wat Arun with a knowledgeable guide.',
      fullDescription:
        'Experience Bangkok\'s most iconic temples in one day. See the Grand Palace and Emerald Buddha, Wat Pho with the Reclining Buddha, and cross the river to Wat Arun. Your guide explains history, dress codes, and Buddhist customs.',
      cityId: cityByNorm['bangkok']?.id,
      meetingPoint: 'Grand Palace main entrance',
      latitude: '13.7500',
      longitude: '100.4915',
      durationMinutes: 360,
      maxGroupSize: 15,
      status: TourStatus.PUBLISHED,
      inventoryMode: InventoryMode.PER_DEPARTURE,
      highlights: ['Grand Palace', 'Wat Pho', 'Wat Arun', 'Skip-the-line access'],
      includedItems: ['English guide', 'Entrance fees', 'Bottled water'],
      excludedItems: ['Lunch', 'Tips', 'Transport to meeting point'],
      whatToBring: ['Modest clothing (long pants, covered shoulders)', 'Comfortable shoes'],
      importantInfo: ['Strict dress code at temples. Sarongs available for rent.'],
      cancellationPolicy: { type: 'FREE', freeCancelHoursBefore: 24 },
      availableLanguages: ['English', 'Thai'],
      allowPayLater: true,
      tagSlugs: ['best-seller', 'skip-the-line', 'local-guide'],
      categorySlugs: ['walking-tours', 'cultural-experiences'],
      itineraryStops: [
        { stopOrder: 1, title: 'Grand Palace & Emerald Buddha', description: 'Tour the palace complex and temple.', durationMinutes: 120, latitude: '13.7500', longitude: '100.4915' },
        { stopOrder: 2, title: 'Wat Pho', description: 'See the Reclining Buddha and traditional massage school.', durationMinutes: 60, latitude: '13.7464', longitude: '100.4934' },
        { stopOrder: 3, title: 'Wat Arun', description: 'Cross Chao Phraya and climb the Temple of Dawn.', durationMinutes: 60, latitude: '13.7438', longitude: '100.4888' },
      ],
      media: [
        { url: 'https://images.unsplash.com/photo-1508009603885-027cf6ddb6e0', altText: 'Grand Palace Bangkok', sortOrder: 1, isCover: true },
        { url: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed', altText: 'Wat Arun temple', sortOrder: 2, isCover: false },
      ],
      options: [{ code: 'group', title: 'Group Tour', description: 'Shared tour', isDefault: true, priceAdult: 45, priceChild: 25 }],
    },
    {
      slug: 'paris-seine-river-cruise',
      title: 'Seine River Cruise with Eiffel Tower Views',
      shortDescription: 'One-hour cruise past the Eiffel Tower, Notre-Dame, and major Paris landmarks.',
      fullDescription:
        'Glide along the Seine on a glass-topped boat. See the Eiffel Tower, Notre-Dame, Louvre, and bridges from the water. Commentary in multiple languages. Perfect for first-time visitors and photo opportunities.',
      cityId: cityByNorm['paris']?.id,
      meetingPoint: 'Port de la Bourdonnais, near Eiffel Tower',
      latitude: '48.8584',
      longitude: '2.2945',
      durationMinutes: 60,
      maxGroupSize: 200,
      status: TourStatus.PUBLISHED,
      inventoryMode: InventoryMode.PER_DEPARTURE,
      highlights: ['Eiffel Tower views', 'Notre-Dame', 'Louvre', 'Commentary'],
      includedItems: ['1-hour cruise', 'Audio guide'],
      excludedItems: ['Food and drinks', 'Hotel pickup'],
      whatToBring: ['Camera', 'Warm layer in winter'],
      importantInfo: ['Boats are wheelchair-accessible. Runs in all weather.'],
      cancellationPolicy: { type: 'FREE', freeCancelHoursBefore: 24 },
      availableLanguages: ['English', 'French', 'Spanish', 'German'],
      allowPayLater: true,
      tagSlugs: ['family-friendly', 'romantic', 'wheelchair-accessible'],
      categorySlugs: ['water-activities', 'cultural-experiences'],
      itineraryStops: [
        { stopOrder: 1, title: 'Seine Cruise', description: 'Full loop from Eiffel Tower area with landmark commentary.', durationMinutes: 60, latitude: '48.8584', longitude: '2.2945' },
      ],
      media: [
        { url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f', altText: 'Seine cruise Paris', sortOrder: 1, isCover: true },
        { url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34', altText: 'Eiffel Tower from Seine', sortOrder: 2, isCover: false },
      ],
      options: [{ code: 'standard', title: 'Day Cruise', description: '1-hour cruise', isDefault: true, priceAdult: 18, priceChild: 10 }],
    },
    {
      slug: 'london-tower-bridge-walking-tour',
      title: 'London Tower Bridge & South Bank Walking Tour',
      shortDescription: 'Walk from Tower Bridge along the South Bank to Big Ben with a local guide.',
      fullDescription:
        'Meet at Tower Bridge and walk along the Thames past HMS Belfast, Shakespeare\'s Globe, Tate Modern, and the London Eye to Parliament and Big Ben. Stories of history, film locations, and modern London.',
      cityId: cityByNorm['london']?.id,
      meetingPoint: 'Tower Bridge — north side',
      latitude: '51.5055',
      longitude: '-0.0754',
      durationMinutes: 180,
      maxGroupSize: 15,
      status: TourStatus.PUBLISHED,
      inventoryMode: InventoryMode.PER_DEPARTURE,
      highlights: ['Tower Bridge', 'South Bank', 'Big Ben', 'Photo stops'],
      includedItems: ['English-speaking guide'],
      excludedItems: ['Entrance to attractions', 'Food and drinks'],
      whatToBring: ['Comfortable shoes', 'Weather-appropriate clothing'],
      importantInfo: ['Tour is outdoors; dress for the weather.'],
      cancellationPolicy: { type: 'FREE', freeCancelHoursBefore: 24 },
      availableLanguages: ['English'],
      allowPayLater: true,
      tagSlugs: ['small-group', 'local-guide', 'family-friendly'],
      categorySlugs: ['walking-tours'],
      itineraryStops: [
        { stopOrder: 1, title: 'Tower Bridge to Borough Market', description: 'Cross the Thames and hear bridge history.', durationMinutes: 45, latitude: '51.5055', longitude: '-0.0754' },
        { stopOrder: 2, title: 'South Bank to Big Ben', description: 'Walk past Globe, Tate, Eye to Parliament.', durationMinutes: 105, latitude: '51.5007', longitude: '-0.1246' },
      ],
      media: [
        { url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad', altText: 'Tower Bridge London', sortOrder: 1, isCover: true },
        { url: 'https://images.unsplash.com/photo-1505761671935-60b3a7427bad', altText: 'London South Bank', sortOrder: 2, isCover: false },
      ],
      options: [{ code: 'group', title: 'Group Walking Tour', description: 'Shared tour', isDefault: true, priceAdult: 28, priceChild: 15 }],
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
      const cat = categoryBySlug[catSlug];
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

async function seedSupplierSettlements() {
  const supplier = await prisma.supplier.findUnique({ where: { slug: 'demo-supplier' } });
  if (!supplier) return;
  const count = await prisma.supplierSettlement.count({ where: { supplierId: supplier.id } });
  if (count >= 10) {
    console.log('  ✓ Supplier settlements: already 10');
    return;
  }
  const now = new Date();
  for (let i = count; i < 10; i++) {
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - i, 0);
    const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 1, 1);
    await prisma.supplierSettlement.create({
      data: {
        supplierId: supplier.id,
        currencyCode: 'USD',
        periodStart,
        periodEnd,
        grossAmount: 5000 + i * 300,
        platformFeeAmount: 500 + i * 30,
        netAmount: 4500 + i * 270,
        payoutStatus: i < 2 ? (i === 0 ? 'PENDING' : 'PAID') : 'PENDING',
        paidAt: i === 1 ? new Date() : null,
      },
    });
  }
  console.log('  ✓ Supplier settlements: 10');
}

async function seedPromotions() {
  const startsAt = new Date();
  const endsAt = new Date();
  endsAt.setFullYear(endsAt.getFullYear() + 1);
  const promos = [
    { code: 'WELCOME10', name: 'Welcome 10%', promoType: PromoType.PERCENT, value: 10, minOrderAmount: 50, usageLimitPerUser: 1, promoScope: PromoScope.GLOBAL },
    { code: 'SAVE20', name: 'Save $20', promoType: PromoType.FIXED_AMOUNT, value: 20, minOrderAmount: 100, maxDiscountAmount: 20, promoScope: PromoScope.GLOBAL },
    { code: 'SUMMER25', name: 'Summer 25%', promoType: PromoType.PERCENT, value: 25, minOrderAmount: 80, promoScope: PromoScope.GLOBAL },
    { code: 'FIRST5', name: 'First booking $5 off', promoType: PromoType.FIXED_AMOUNT, value: 5, minOrderAmount: 30, usageLimitPerUser: 1, promoScope: PromoScope.GLOBAL },
    { code: 'VIP15', name: 'VIP 15%', promoType: PromoType.PERCENT, value: 15, minOrderAmount: 200, promoScope: PromoScope.GLOBAL },
    { code: 'WEEKEND10', name: 'Weekend 10%', promoType: PromoType.PERCENT, value: 10, minOrderAmount: 40, promoScope: PromoScope.GLOBAL },
    { code: 'FLASH30', name: 'Flash 30%', promoType: PromoType.PERCENT, value: 30, minOrderAmount: 60, usageLimitTotal: 100, promoScope: PromoScope.GLOBAL },
    { code: 'FAMILY20', name: 'Family $20 off', promoType: PromoType.FIXED_AMOUNT, value: 20, minOrderAmount: 150, promoScope: PromoScope.GLOBAL },
    { code: 'NEWYEAR50', name: 'New Year $50', promoType: PromoType.FIXED_AMOUNT, value: 50, minOrderAmount: 200, maxDiscountAmount: 50, promoScope: PromoScope.GLOBAL },
    { code: 'LOCAL5', name: 'Local $5', promoType: PromoType.FIXED_AMOUNT, value: 5, minOrderAmount: 25, promoScope: PromoScope.GLOBAL },
  ];
  for (const p of promos) {
    await prisma.promotion.upsert({
      where: { code: p.code },
      update: { name: p.name, promoType: p.promoType, value: p.value, minOrderAmount: p.minOrderAmount ?? 0, maxDiscountAmount: p.maxDiscountAmount ?? null, usageLimitTotal: p.usageLimitTotal ?? null, usageLimitPerUser: p.usageLimitPerUser ?? null, startsAt, endsAt, isActive: true },
      create: { code: p.code, name: p.name, promoType: p.promoType, promoScope: p.promoScope, value: p.value, minOrderAmount: p.minOrderAmount ?? 0, maxDiscountAmount: p.maxDiscountAmount ?? null, usageLimitTotal: p.usageLimitTotal ?? null, usageLimitPerUser: p.usageLimitPerUser ?? null, startsAt, endsAt, isActive: true },
    });
  }
  console.log('  ✓ Promotions: 10');
}

async function seedNotificationTemplates() {
  const templates = [
    { eventKey: 'booking_confirmed', channel: NotificationChannel.EMAIL, subject: 'Booking confirmed – {{bookingRef}}', body: 'Hi {{guestName}}, your booking {{bookingRef}} is confirmed. Total: {{totalAmount}}.' },
    { eventKey: 'booking_reminder', channel: NotificationChannel.EMAIL, subject: 'Reminder: your tour tomorrow', body: 'Your tour {{tourTitle}} is tomorrow at {{startsAt}}. Meeting point: {{meetingPoint}}.' },
    { eventKey: 'payment_received', channel: NotificationChannel.EMAIL, subject: 'Payment received', body: 'We received your payment of {{amount}} for booking {{bookingRef}}.' },
    { eventKey: 'voucher_issued', channel: NotificationChannel.EMAIL, subject: 'Your voucher – {{bookingRef}}', body: 'Your voucher code: {{voucherCode}}. Show this at the meeting point.' },
    { eventKey: 'booking_cancelled', channel: NotificationChannel.EMAIL, subject: 'Booking cancelled', body: 'Your booking {{bookingRef}} has been cancelled. Refund will be processed if applicable.' },
    { eventKey: 'password_reset', channel: NotificationChannel.EMAIL, subject: 'Reset your password', body: 'Click here to reset: {{resetUrl}}. Expires in 1 hour.' },
    { eventKey: 'welcome', channel: NotificationChannel.EMAIL, subject: 'Welcome to GetYourGuide', body: 'Thanks for signing up! Explore tours and book with confidence.' },
    { eventKey: 'review_request', channel: NotificationChannel.EMAIL, subject: 'How was your tour?', body: 'We\'d love your feedback for {{tourTitle}}. Leave a review here: {{reviewUrl}}.' },
    { eventKey: 'booking_confirmed', channel: NotificationChannel.IN_APP, subject: null, body: 'Booking {{bookingRef}} confirmed.' },
    { eventKey: 'promo_reminder', channel: NotificationChannel.EMAIL, subject: 'Your promo {{code}} expires soon', body: 'Use {{code}} before {{endsAt}} for {{value}} off.' },
  ];
  for (const t of templates) {
    try {
      await prisma.notificationTemplate.upsert({
        where: { eventKey_channel_languageCode: { eventKey: t.eventKey, channel: t.channel, languageCode: null } },
        update: { subject: t.subject, body: t.body, isActive: true },
        create: { eventKey: t.eventKey, channel: t.channel, languageCode: null, subject: t.subject, body: t.body, isActive: true },
      });
    } catch {
      await prisma.notificationTemplate.create({
        data: { eventKey: t.eventKey, channel: t.channel, languageCode: null, subject: t.subject, body: t.body, isActive: true },
      });
    }
  }
  console.log('  ✓ Notification templates: 10');
}

async function seedCmsPages(usersByEmail) {
  const adminId = usersByEmail['admin@getyourguide.local']?.id;
  const pages = [
    { slug: 'about', title: 'About Us', content: 'We connect travelers with the best tours and activities worldwide.', pageGroup: 'general', status: CmsPageStatus.PUBLISHED },
    { slug: 'terms', title: 'Terms of Service', content: 'By using our platform you agree to these terms.', pageGroup: 'legal', status: CmsPageStatus.PUBLISHED },
    { slug: 'privacy', title: 'Privacy Policy', content: 'We respect your privacy. This policy explains how we use your data.', pageGroup: 'legal', status: CmsPageStatus.PUBLISHED },
    { slug: 'contact', title: 'Contact', content: 'Email: support@getyourguide.local. We reply within 24 hours.', pageGroup: 'general', status: CmsPageStatus.PUBLISHED },
    { slug: 'faq', title: 'Frequently Asked Questions', content: 'See our FAQ section for common questions.', pageGroup: 'general', status: CmsPageStatus.PUBLISHED },
    { slug: 'cancellation-policy', title: 'Cancellation Policy', content: 'Free cancellation up to 24–48h before depending on the tour. See each tour for details.', pageGroup: 'legal', status: CmsPageStatus.PUBLISHED },
    { slug: 'cookie-policy', title: 'Cookie Policy', content: 'We use cookies to improve your experience.', pageGroup: 'legal', status: CmsPageStatus.PUBLISHED },
    { slug: 'how-it-works', title: 'How It Works', content: 'Browse, book, and enjoy. Pay securely. Get your voucher by email.', pageGroup: 'general', status: CmsPageStatus.PUBLISHED },
    { slug: 'safety', title: 'Safety & Trust', content: 'We verify suppliers and support you before, during, and after your trip.', pageGroup: 'general', status: CmsPageStatus.PUBLISHED },
    { slug: 'careers', title: 'Careers', content: 'Join our team. Send your CV to jobs@getyourguide.local.', pageGroup: 'general', status: CmsPageStatus.DRAFT },
  ];
  for (const p of pages) {
    const page = await prisma.cmsPage.upsert({
      where: { slug: p.slug },
      update: { title: p.title, content: p.content, pageGroup: p.pageGroup, status: p.status, publishedAt: p.status === CmsPageStatus.PUBLISHED ? new Date() : null, updatedBy: adminId },
      create: { slug: p.slug, title: p.title, content: p.content, pageGroup: p.pageGroup, status: p.status, publishedAt: p.status === CmsPageStatus.PUBLISHED ? new Date() : null, createdBy: adminId, updatedBy: adminId },
    });
    await prisma.cmsPageTranslation.upsert({
      where: { pageId_languageCode: { pageId: page.id, languageCode: 'vi' } },
      update: { title: p.title, content: p.content },
      create: { pageId: page.id, languageCode: 'vi', title: p.title, content: p.content },
    }).catch(() => {});
  }
  console.log('  ✓ CMS pages: 10');
}

async function seedReviews(usersByEmail) {
  const customerIds = [
    usersByEmail['customer@getyourguide.local']?.id,
    usersByEmail['maria.garcia@example.com']?.id,
    usersByEmail['james.wilson@example.com']?.id,
  ].filter(Boolean);
  const tours = await prisma.tour.findMany({ where: { status: 'PUBLISHED' }, take: 10 });
  if (customerIds.length === 0 || tours.length === 0) return;
  const reviews = [
    { rating: 5, title: 'Amazing experience!', body: 'Our guide was knowledgeable and fun. Highly recommend.' },
    { rating: 4, title: 'Great tour', body: 'Good value. A bit rushed at the end.' },
    { rating: 5, title: 'Perfect for first-timers', body: 'Saw all the highlights. Would do again.' },
    { rating: 4, title: 'Enjoyable', body: 'Weather was great. Guide spoke clear English.' },
    { rating: 5, title: 'Best food tour ever', body: 'So much food! Hidden gems only locals know.' },
    { rating: 4, title: 'Worth it', body: 'Interesting history. Comfortable transport.' },
    { rating: 5, title: 'Exceeded expectations', body: 'Family loved it. Book this one!' },
    { rating: 4, title: 'Good overview', body: 'Nice way to see the city in half a day.' },
    { rating: 5, title: 'Unforgettable', body: 'The sunset view was incredible.' },
    { rating: 4, title: 'Solid tour', body: 'Professional and on time.' },
  ];
  for (let i = 0; i < Math.min(10, tours.length, customerIds.length); i++) {
    const tour = tours[i];
    const user = customerIds[i];
    const r = reviews[i];
    try {
      await prisma.review.create({
        data: {
          tourId: tour.id,
          userId: user,
          rating: r.rating,
          title: r.title,
          body: r.body,
          languageCode: 'en',
          status: ReviewStatus.PUBLISHED,
          verifiedBooking: false,
        },
      });
    } catch (_) {}
  }
  const count = await prisma.review.count();
  console.log(`  ✓ Reviews: ${count}`);
}

async function seedBookings(usersByEmail) {
  const customer = usersByEmail['customer@getyourguide.local'];
  if (!customer) return;
  const tour = await prisma.tour.findFirst({ where: { status: 'PUBLISHED' } });
  if (!tour) return;
  const option = await prisma.tourOption.findFirst({ where: { tourId: tour.id } });
  if (!option) return;
  const slot = await prisma.departureSlot.findFirst({ where: { tourOptionId: option.id, status: 'ACTIVE' } });
  if (!slot) return;
  const inv = await prisma.inventorySlot.findUnique({ where: { departureSlotId: slot.id } });
  if (!inv || inv.totalCapacity - inv.bookedCapacity < 2) return;

  const bookingRef = 'GYG-' + Date.now().toString(36).toUpperCase() + '-SEED';
  const totalAmount = 60;
  const booking = await prisma.booking.create({
    data: {
      bookingRef,
      userId: customer.id,
      supplierId: await prisma.tour.findUnique({ where: { id: tour.id } }).then((t) => t?.supplierId ?? null),
      status: BookingStatus.CONFIRMED,
      currencyCode: 'USD',
      subtotalAmount: totalAmount,
      discountAmount: 0,
      feeAmount: 0,
      taxAmount: 0,
      totalAmount,
      contactEmail: customer.email,
      confirmedAt: new Date(),
    },
  });

  await prisma.bookingItem.create({
    data: {
      bookingId: booking.id,
      tourId: tour.id,
      tourOptionId: option.id,
      departureSlotId: slot.id,
      inventorySlotId: inv.id,
      titleSnapshot: 'Hanoi Old Quarter Walking Tour',
      optionSnapshot: 'Group Tour',
      startsAtSnapshot: slot.startsAt,
      travelerMix: [{ type: 'adult', count: 2 }],
      languageCode: 'en',
      quantity: 2,
      unitPrice: 30,
      lineTotal: 60,
    },
  });

  await prisma.inventorySlot.update({
    where: { id: inv.id },
    data: { bookedCapacity: inv.bookedCapacity + 2 },
  });

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      provider: 'stripe',
      providerPaymentId: 'pi_seed_' + booking.id,
      status: PaymentStatus.CAPTURED,
      currencyCode: 'USD',
      amount: totalAmount,
      authorizedAmount: totalAmount,
      capturedAmount: totalAmount,
      capturedAt: new Date(),
    },
  });

  await prisma.invoice.create({
    data: {
      bookingId: booking.id,
      invoiceNumber: 'INV-' + booking.bookingRef,
      buyerName: customer.firstName + ' ' + customer.lastName,
      currencyCode: 'USD',
      subtotalAmount: totalAmount,
      taxAmount: 0,
      totalAmount,
    },
  });

  await prisma.bookingVoucher.create({
    data: {
      bookingId: booking.id,
      voucherCode: 'V' + booking.bookingRef.replace(/-/g, '').slice(-10),
      qrPayload: booking.id,
    },
  });

  await prisma.bookingEvent.create({
    data: { bookingId: booking.id, eventType: 'booking.confirmed', payload: {} },
  });

  console.log('  ✓ Bookings: 1 confirmed (with payment, invoice, voucher)');
}

async function seedNewsletterSubscriptions() {
  const emails = [
    'news1@example.com', 'news2@example.com', 'news3@example.com', 'news4@example.com', 'news5@example.com',
    'news6@example.com', 'news7@example.com', 'news8@example.com', 'news9@example.com', 'news10@example.com',
  ];
  for (const email of emails) {
    await prisma.newsletterSubscription.upsert({
      where: { email },
      update: { isActive: true },
      create: { email, isActive: true },
    });
  }
  console.log('  ✓ Newsletter subscriptions: 10');
}

async function seedUserFavoriteTours(usersByEmail) {
  const userIds = [usersByEmail['customer@getyourguide.local']?.id, usersByEmail['maria.garcia@example.com']?.id].filter(Boolean);
  const tours = await prisma.tour.findMany({ where: { status: 'PUBLISHED' }, take: 5 });
  for (const userId of userIds) {
    for (const tour of tours) {
      await prisma.userFavoriteTour.upsert({
        where: { userId_tourId: { userId, tourId: tour.id } },
        update: {},
        create: { userId, tourId: tour.id },
      }).catch(() => {});
    }
  }
  const count = await prisma.userFavoriteTour.count();
  console.log(`  ✓ User favorite tours: ${count}`);
}

async function seedBlogPostRelatedTours() {
  const posts = await prisma.blogPost.findMany({ take: 5 });
  const tours = await prisma.tour.findMany({ where: { status: 'PUBLISHED' }, take: 5 });
  for (let i = 0; i < posts.length && i < tours.length; i++) {
    await prisma.blogPostRelatedTour.upsert({
      where: { postId_tourId: { postId: posts[i].id, tourId: tours[i].id } },
      update: { sortOrder: i },
      create: { postId: posts[i].id, tourId: tours[i].id, sortOrder: i },
    }).catch(() => {});
  }
  console.log('  ✓ Blog post related tours: linked');
}

async function seedApiKeys(usersByEmail) {
  const admin = usersByEmail['admin@getyourguide.local'];
  if (!admin) return;
  const keyPrefix = 'gyg_live_';
  const keyHash = crypto.createHash('sha256').update('seed-secret-key-do-not-use').digest('hex');
  try {
    await prisma.apiKey.upsert({
      where: { keyHash },
      update: { name: 'Seed API Key', isActive: true },
      create: {
        ownerType: 'user',
        ownerId: admin.id,
        keyPrefix,
        keyHash,
        name: 'Seed API Key',
        scopes: ['tours:read', 'bookings:read'],
        isActive: true,
      },
    });
  } catch {
    await prisma.apiKey.create({
      data: {
        ownerType: 'user',
        ownerId: admin.id,
        keyPrefix,
        keyHash,
        name: 'Seed API Key',
        scopes: ['tours:read', 'bookings:read'],
        isActive: true,
      },
    });
  }
  console.log('  ✓ API keys: 1');
}

async function seedAuditLogs(usersByEmail) {
  const adminId = usersByEmail['admin@getyourguide.local']?.id;
  if (!adminId) return;
  const actions = [
    { action: 'user.login', entityType: 'User', entityId: null },
    { action: 'tour.published', entityType: 'Tour', entityId: null },
    { action: 'setting.updated', entityType: 'SystemSetting', entityId: null },
    { action: 'promotion.created', entityType: 'Promotion', entityId: null },
    { action: 'page.published', entityType: 'CmsPage', entityId: null },
    { action: 'booking.confirmed', entityType: 'Booking', entityId: null },
    { action: 'review.published', entityType: 'Review', entityId: null },
    { action: 'faq.updated', entityType: 'SupportFaqItem', entityId: null },
    { action: 'blog.post_published', entityType: 'BlogPost', entityId: null },
    { action: 'supplier.updated', entityType: 'Supplier', entityId: null },
  ];
  for (const a of actions) {
    await prisma.auditLog.create({
      data: {
        actorUserId: adminId,
        actorRole: UserRole.ADMIN,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        ipAddress: '127.0.0.1',
        userAgent: 'Seed',
      },
    });
  }
  console.log('  ✓ Audit logs: 10');
}

async function main() {
  console.log('Seeding reference data...');
  await seedReferenceData();

  console.log('Seeding users & roles...');
  const usersByEmail = await seedUsersAndRoles();

  console.log('Seeding supplier mapping...');
  await seedSupplierMapping(usersByEmail);

  console.log('Seeding supplier settlements...');
  await seedSupplierSettlements();

  console.log('Seeding FAQ...');
  await seedFaq();

  console.log('Seeding blog...');
  await seedBlog(usersByEmail);

  console.log('Seeding tours...');
  await seedTours();

  console.log('Seeding promotions...');
  await seedPromotions();

  console.log('Seeding notification templates...');
  await seedNotificationTemplates();

  console.log('Seeding CMS pages...');
  await seedCmsPages(usersByEmail);

  console.log('Seeding reviews...');
  await seedReviews(usersByEmail);

  console.log('Seeding bookings (with payment, invoice, voucher)...');
  await seedBookings(usersByEmail);

  console.log('Seeding newsletter subscriptions...');
  await seedNewsletterSubscriptions();

  console.log('Seeding user favorite tours...');
  await seedUserFavoriteTours(usersByEmail);

  console.log('Seeding blog post related tours...');
  await seedBlogPostRelatedTours();

  console.log('Seeding API keys...');
  await seedApiKeys(usersByEmail);

  console.log('Seeding audit logs...');
  await seedAuditLogs(usersByEmail);

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
