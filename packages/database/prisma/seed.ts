/**
 * Seed script — realistic Libyan dev data for the Tripoli + Benghazi launch.
 * Idempotent: rows are upserted on unique keys or stable `seed-*` ids, so it
 * is safe to run repeatedly.
 *
 * Run: pnpm --filter @karhabti/database db:seed
 */
// TODO: review Arabic copy — all Arabic strings below are placeholders
// pending review by a native Libyan speaker (the operations partner).
import { MaintenanceSource, PrismaClient, ProductStatus, ProviderStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Real password hashing arrives with the auth module (Phase 1, Step 5).
// Seed users cannot log in until then.
const PLACEHOLDER_PASSWORD_HASH = 'seed-placeholder-hash-replaced-in-phase1-step5';

const VEHICLE_CATALOG = [
  {
    name: 'Toyota',
    slug: 'toyota',
    models: ['Corolla', 'Camry', 'Yaris', 'Hilux', 'Land Cruiser'],
  },
  {
    name: 'Hyundai',
    slug: 'hyundai',
    models: ['Accent', 'Elantra', 'Sonata', 'Tucson', 'Santa Fe'],
  },
  { name: 'Kia', slug: 'kia', models: ['Rio', 'Cerato', 'Picanto', 'Sportage', 'Sorento'] },
  { name: 'Nissan', slug: 'nissan', models: ['Sunny', 'Micra', 'Altima', 'Qashqai', 'Patrol'] },
  {
    name: 'Mitsubishi',
    slug: 'mitsubishi',
    models: ['Lancer', 'Attrage', 'Outlander', 'Pajero', 'L200'],
  },
] as const;

const MAINTENANCE_ITEMS = [
  {
    slug: 'oil-change',
    nameAr: 'تغيير زيت المحرك',
    nameEn: 'Engine oil change',
    defaultIntervalKm: 10000,
    defaultIntervalMonths: 6,
  },
  {
    slug: 'oil-filter',
    nameAr: 'تغيير فلتر الزيت',
    nameEn: 'Oil filter replacement',
    defaultIntervalKm: 10000,
    defaultIntervalMonths: 6,
  },
  {
    slug: 'air-filter',
    nameAr: 'تغيير فلتر الهواء',
    nameEn: 'Air filter replacement',
    // dusty Libyan climate — shorter than the usual 20k interval
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
  },
  {
    slug: 'cabin-filter',
    nameAr: 'تغيير فلتر المكيف',
    nameEn: 'Cabin filter replacement',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
  },
  {
    slug: 'tire-rotation',
    nameAr: 'تدوير الإطارات',
    nameEn: 'Tire rotation',
    defaultIntervalKm: 10000,
    defaultIntervalMonths: 6,
  },
  {
    slug: 'brake-check',
    nameAr: 'فحص الفرامل',
    nameEn: 'Brake check',
    defaultIntervalKm: 20000,
    defaultIntervalMonths: 12,
  },
  {
    slug: 'coolant-flush',
    nameAr: 'تغيير سائل التبريد',
    nameEn: 'Coolant flush',
    defaultIntervalKm: 40000,
    defaultIntervalMonths: 24,
  },
  {
    slug: 'battery-check',
    nameAr: 'فحص البطارية',
    nameEn: 'Battery check',
    defaultIntervalKm: null,
    defaultIntervalMonths: 12,
  },
  {
    slug: 'spark-plugs',
    nameAr: 'تغيير شمعات الإشعال',
    nameEn: 'Spark plug replacement',
    defaultIntervalKm: 40000,
    defaultIntervalMonths: 36,
  },
] as const;

async function seedVehicleCatalog(): Promise<
  Record<string, { makeId: string; models: Record<string, string> }>
> {
  const catalog: Record<string, { makeId: string; models: Record<string, string> }> = {};
  for (const make of VEHICLE_CATALOG) {
    const makeRow = await prisma.vehicleMake.upsert({
      where: { slug: make.slug },
      update: { name: make.name },
      create: { name: make.name, slug: make.slug },
    });
    const models: Record<string, string> = {};
    for (const modelName of make.models) {
      const slug = modelName.toLowerCase().replace(/\s+/g, '-');
      const modelRow = await prisma.vehicleModel.upsert({
        where: { makeId_slug: { makeId: makeRow.id, slug } },
        update: { name: modelName },
        create: { makeId: makeRow.id, name: modelName, slug },
      });
      models[slug] = modelRow.id;
    }
    catalog[make.slug] = { makeId: makeRow.id, models };
  }
  return catalog;
}

async function seedMaintenanceItems(): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const item of MAINTENANCE_ITEMS) {
    const row = await prisma.maintenanceItem.upsert({
      where: { slug: item.slug },
      update: {
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        defaultIntervalKm: item.defaultIntervalKm,
        defaultIntervalMonths: item.defaultIntervalMonths,
      },
      create: { ...item },
    });
    ids[item.slug] = row.id;
  }
  return ids;
}

async function seedServices(): Promise<void> {
  const carWash = await prisma.serviceCategory.upsert({
    where: { slug: 'car-wash' },
    update: {},
    create: {
      slug: 'car-wash',
      nameAr: 'غسيل السيارات',
      nameEn: 'Car wash',
      sortOrder: 1,
    },
  });

  const services = [
    {
      id: 'seed-service-exterior-wash',
      nameAr: 'غسيل خارجي',
      nameEn: 'Exterior wash',
      descriptionAr: 'غسيل خارجي كامل للسيارة في موقعك مع تجفيف يدوي.',
      descriptionEn: 'Full exterior wash at your location with hand drying.',
      basePriceLYD: '25.00',
      durationMinutes: 30,
    },
    {
      id: 'seed-service-full-wash',
      nameAr: 'غسيل شامل (داخلي وخارجي)',
      nameEn: 'Full wash (interior + exterior)',
      descriptionAr: 'غسيل خارجي وتنظيف داخلي شامل مع تعطير المقصورة.',
      descriptionEn: 'Exterior wash plus complete interior cleaning and cabin freshening.',
      basePriceLYD: '40.00',
      durationMinutes: 50,
    },
    {
      id: 'seed-service-premium-detail',
      nameAr: 'تلميع وتنظيف فاخر',
      nameEn: 'Premium detail wash',
      descriptionAr: 'تنظيف وتلميع شامل بالبخار مع العناية بالتفاصيل الدقيقة.',
      descriptionEn: 'Deep steam clean and polish with fine detailing.',
      basePriceLYD: '70.00',
      durationMinutes: 90,
    },
  ];

  for (const service of services) {
    const { id, ...data } = service;
    await prisma.service.upsert({
      where: { id },
      update: { ...data },
      create: { id, categoryId: carWash.id, ...data },
    });
  }
}

interface SeedUsers {
  ahmedId: string;
  fatimaId: string;
  providerUserId: string;
  providerId: string;
}

async function seedUsers(): Promise<SeedUsers> {
  await prisma.user.upsert({
    where: { phone: '0910000001' },
    update: {},
    create: {
      phone: '0910000001',
      passwordHash: PLACEHOLDER_PASSWORD_HASH,
      displayName: 'مدير كرهبتي',
      role: 'ADMIN',
      isPhoneVerified: true,
    },
  });

  const ahmed = await prisma.user.upsert({
    where: { phone: '0912345678' },
    update: {},
    create: {
      phone: '0912345678',
      passwordHash: PLACEHOLDER_PASSWORD_HASH,
      displayName: 'أحمد التريكي',
      isPhoneVerified: true,
    },
  });

  const fatima = await prisma.user.upsert({
    where: { phone: '0944567890' },
    update: {},
    create: {
      phone: '0944567890',
      passwordHash: PLACEHOLDER_PASSWORD_HASH,
      displayName: 'فاطمة بن عمر',
      isPhoneVerified: true,
    },
  });

  const providerUser = await prisma.user.upsert({
    where: { phone: '0923456789' },
    update: {},
    create: {
      phone: '0923456789',
      passwordHash: PLACEHOLDER_PASSWORD_HASH,
      displayName: 'صالح الفيتوري',
      role: 'PROVIDER',
      isPhoneVerified: true,
    },
  });

  const provider = await prisma.serviceProvider.upsert({
    where: { userId: providerUser.id },
    update: {},
    create: {
      userId: providerUser.id,
      businessName: 'غسيل الصقر المتنقل',
      governorate: 'tripoli',
      serviceAreas: ['قرقارش', 'حي الأندلس', 'تاجوراء'],
      isVerified: true,
      status: ProviderStatus.ACTIVE,
    },
  });

  const addresses = [
    {
      id: 'seed-addr-ahmed-home',
      userId: ahmed.id,
      label: 'المنزل',
      governorate: 'tripoli',
      city: 'tripoli',
      area: 'حي الأندلس',
      details: 'شارع الجرابة، بجوار مسجد الأندلس',
      isDefault: true,
    },
    {
      id: 'seed-addr-ahmed-work',
      userId: ahmed.id,
      label: 'العمل',
      governorate: 'tripoli',
      city: 'tripoli',
      area: 'قرقارش',
      details: 'طريق السياحية، مجمع المكاتب',
      isDefault: false,
    },
    {
      id: 'seed-addr-fatima-home',
      userId: fatima.id,
      label: 'المنزل',
      governorate: 'benghazi',
      city: 'benghazi',
      area: 'الفويهات',
      details: 'بالقرب من جامعة بنغازي',
      isDefault: true,
    },
  ];
  for (const address of addresses) {
    const { id, ...data } = address;
    await prisma.address.upsert({ where: { id }, update: { ...data }, create: { id, ...data } });
  }

  return {
    ahmedId: ahmed.id,
    fatimaId: fatima.id,
    providerUserId: providerUser.id,
    providerId: provider.id,
  };
}

async function seedVehicles(
  users: SeedUsers,
  catalog: Awaited<ReturnType<typeof seedVehicleCatalog>>,
  maintenanceItems: Record<string, string>,
): Promise<void> {
  const toyota = catalog['toyota'];
  const hyundai = catalog['hyundai'];
  const kia = catalog['kia'];
  if (!toyota || !hyundai || !kia) throw new Error('vehicle catalog seed incomplete');

  const vehicles = [
    {
      id: 'seed-vehicle-ahmed-corolla',
      userId: users.ahmedId,
      makeId: toyota.makeId,
      modelId: toyota.models['corolla'],
      year: 2018,
      engine: '1.6L',
      nickname: 'كرولا العائلة',
      mileageKm: 85000,
      color: 'silver',
      isDefault: true,
    },
    {
      id: 'seed-vehicle-ahmed-rio',
      userId: users.ahmedId,
      makeId: kia.makeId,
      modelId: kia.models['rio'],
      year: 2016,
      engine: '1.4L',
      mileageKm: 110000,
      color: 'white',
      isDefault: false,
    },
    {
      id: 'seed-vehicle-fatima-accent',
      userId: users.fatimaId,
      makeId: hyundai.makeId,
      modelId: hyundai.models['accent'],
      year: 2020,
      engine: '1.6L',
      nickname: 'أكسنت',
      mileageKm: 42000,
      color: 'red',
      isDefault: true,
    },
  ];
  for (const vehicle of vehicles) {
    const { id, modelId, ...data } = vehicle;
    if (!modelId) throw new Error(`missing model for seed vehicle ${id}`);
    await prisma.vehicle.upsert({
      where: { id },
      update: { mileageKm: data.mileageKm },
      create: { id, modelId, ...data },
    });
  }

  const now = Date.now();
  const daysAgo = (days: number): Date => new Date(now - days * 24 * 60 * 60 * 1000);
  const daysAhead = (days: number): Date => new Date(now + days * 24 * 60 * 60 * 1000);

  const oilChangeId = maintenanceItems['oil-change'];
  const airFilterId = maintenanceItems['air-filter'];
  const brakeCheckId = maintenanceItems['brake-check'];
  if (!oilChangeId || !airFilterId || !brakeCheckId) {
    throw new Error('maintenance item seed incomplete');
  }

  const records = [
    {
      id: 'seed-record-corolla-oil',
      vehicleId: 'seed-vehicle-ahmed-corolla',
      maintenanceItemId: oilChangeId,
      performedAt: daysAgo(90),
      mileageAtServiceKm: 80000,
      source: MaintenanceSource.SELF_REPORTED,
      nextDueKm: 90000,
      nextDueDate: daysAhead(90),
      notes: 'زيت 5W-30 تخليقي كامل',
    },
    {
      id: 'seed-record-corolla-air-filter',
      vehicleId: 'seed-vehicle-ahmed-corolla',
      maintenanceItemId: airFilterId,
      performedAt: daysAgo(200),
      mileageAtServiceKm: 74000,
      source: MaintenanceSource.SELF_REPORTED,
      nextDueKm: 89000,
      nextDueDate: daysAhead(165),
    },
    {
      id: 'seed-record-accent-oil',
      vehicleId: 'seed-vehicle-fatima-accent',
      maintenanceItemId: oilChangeId,
      performedAt: daysAgo(30),
      mileageAtServiceKm: 40000,
      source: MaintenanceSource.SELF_REPORTED,
      nextDueKm: 50000,
      nextDueDate: daysAhead(150),
    },
    {
      id: 'seed-record-rio-brakes',
      vehicleId: 'seed-vehicle-ahmed-rio',
      maintenanceItemId: brakeCheckId,
      performedAt: daysAgo(400),
      mileageAtServiceKm: 95000,
      source: MaintenanceSource.SELF_REPORTED,
      nextDueKm: 115000,
      nextDueDate: daysAgo(35), // intentionally overdue — exercises reminders later
    },
  ];
  for (const record of records) {
    const { id, ...data } = record;
    await prisma.vehicleMaintenanceRecord.upsert({
      where: { id },
      update: {},
      create: { id, ...data },
    });
  }
}

async function seedProducts(
  catalog: Awaited<ReturnType<typeof seedVehicleCatalog>>,
): Promise<void> {
  const categories = [
    { slug: 'filters', nameAr: 'فلاتر', nameEn: 'Filters', sortOrder: 1 },
    { slug: 'brakes', nameAr: 'فرامل', nameEn: 'Brakes', sortOrder: 2 },
    { slug: 'batteries', nameAr: 'بطاريات', nameEn: 'Batteries', sortOrder: 3 },
    { slug: 'oils-fluids', nameAr: 'زيوت وسوائل', nameEn: 'Oils & fluids', sortOrder: 4 },
  ];
  const categoryIds: Record<string, string> = {};
  for (const category of categories) {
    const row = await prisma.productCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: { ...category },
    });
    categoryIds[category.slug] = row.id;
  }

  const toyota = catalog['toyota'];
  const hyundai = catalog['hyundai'];
  if (!toyota || !hyundai) throw new Error('vehicle catalog seed incomplete');

  const products = [
    {
      id: 'seed-product-corolla-oil-filter',
      category: 'filters',
      nameAr: 'فلتر زيت تويوتا أصلي',
      nameEn: 'Genuine Toyota oil filter',
      descriptionAr: 'فلتر زيت أصلي لمحركات تويوتا 1.6 و 1.8 لتر.',
      descriptionEn: 'Genuine oil filter for Toyota 1.6 and 1.8 litre engines.',
      oemCode: '90915-YZZE1',
      brand: 'Toyota',
      priceLYD: '25.00',
      stock: 40,
      fitment: {
        makeId: toyota.makeId,
        modelId: toyota.models['corolla'],
        yearFrom: 2008,
        yearTo: 2019,
      },
    },
    {
      id: 'seed-product-corolla-air-filter',
      category: 'filters',
      nameAr: 'فلتر هواء تويوتا كورولا',
      nameEn: 'Toyota Corolla air filter',
      descriptionAr: 'فلتر هواء عالي الكفاءة مناسب للأجواء المغبرة.',
      descriptionEn: 'High-efficiency air filter, suited to dusty conditions.',
      oemCode: '17801-21050',
      brand: 'Toyota',
      priceLYD: '45.00',
      stock: 25,
      fitment: {
        makeId: toyota.makeId,
        modelId: toyota.models['corolla'],
        yearFrom: 2014,
        yearTo: 2019,
      },
    },
    {
      id: 'seed-product-corolla-brake-pads',
      category: 'brakes',
      nameAr: 'فحمات فرامل أمامية كورولا',
      nameEn: 'Front brake pads — Corolla',
      descriptionAr: 'طقم فحمات فرامل أمامية أصلية.',
      descriptionEn: 'Genuine front brake pad set.',
      oemCode: '04465-02220',
      brand: 'Toyota',
      priceLYD: '120.00',
      stock: 15,
      fitment: {
        makeId: toyota.makeId,
        modelId: toyota.models['corolla'],
        yearFrom: 2008,
        yearTo: 2019,
      },
    },
    {
      id: 'seed-product-accent-oil-filter',
      category: 'filters',
      nameAr: 'فلتر زيت هيونداي أصلي',
      nameEn: 'Genuine Hyundai oil filter',
      descriptionAr: 'فلتر زيت أصلي لمحركات هيونداي وكيا.',
      descriptionEn: 'Genuine oil filter for Hyundai and Kia engines.',
      oemCode: '26300-35505',
      brand: 'Hyundai',
      priceLYD: '20.00',
      stock: 50,
      fitment: {
        makeId: hyundai.makeId,
        modelId: hyundai.models['accent'],
        yearFrom: 2011,
        yearTo: 2023,
      },
    },
    {
      id: 'seed-product-battery-60ah',
      category: 'batteries',
      nameAr: 'بطارية فارتا 60 أمبير',
      nameEn: 'Varta 60Ah battery',
      descriptionAr: 'بطارية 12 فولت 60 أمبير مناسبة لمعظم سيارات السيدان.',
      descriptionEn: '12V 60Ah battery, fits most sedans.',
      aftermarketCode: 'VARTA-D24-560408054',
      brand: 'Varta',
      priceLYD: '350.00',
      stock: 12,
      warrantyMonths: 12,
      fitment: { makeId: toyota.makeId }, // fits across the range; per-model rows can refine later
    },
    {
      id: 'seed-product-castrol-5w30',
      category: 'oils-fluids',
      nameAr: 'زيت كاسترول GTX 5W-30 (4 لتر)',
      nameEn: 'Castrol GTX 5W-30 (4L)',
      descriptionAr: 'زيت محرك تخليقي مناسب للحرارة العالية.',
      descriptionEn: 'Synthetic engine oil suited to high temperatures.',
      aftermarketCode: 'CASTROL-GTX-5W30-4L',
      brand: 'Castrol',
      priceLYD: '90.00',
      stock: 60,
      fitment: { makeId: toyota.makeId },
    },
  ];

  for (const product of products) {
    const { id, category, fitment, ...data } = product;
    const categoryId = categoryIds[category];
    if (!categoryId) throw new Error(`missing category ${category}`);
    await prisma.product.upsert({
      where: { id },
      update: { stock: data.stock, priceLYD: data.priceLYD },
      create: { id, categoryId, status: ProductStatus.ACTIVE, ...data },
    });
    await prisma.productFitment.upsert({
      where: { id: `${id}-fitment` },
      update: {},
      create: { id: `${id}-fitment`, productId: id, ...fitment },
    });
  }
}

async function seedCareTips(
  catalog: Awaited<ReturnType<typeof seedVehicleCatalog>>,
): Promise<void> {
  const toyota = catalog['toyota'];
  if (!toyota) throw new Error('vehicle catalog seed incomplete');

  const tips = [
    {
      id: 'seed-tip-summer-coolant',
      titleAr: 'افحص سائل التبريد قبل الصيف',
      titleEn: 'Check your coolant before summer',
      bodyAr:
        'مع تجاوز الحرارة 40 درجة في الصيف الليبي، تأكد من مستوى سائل التبريد وحالة خراطيم الرديتر قبل موجات الحر.',
      bodyEn:
        'With Libyan summer temperatures passing 40°C, check coolant level and radiator hoses before the heat waves arrive.',
      category: 'seasonal',
      conditions: ['summer-heat'],
    },
    {
      id: 'seed-tip-dust-air-filter',
      titleAr: 'الغبار يقصّر عمر فلتر الهواء',
      titleEn: 'Dust shortens your air filter life',
      bodyAr:
        'في مواسم الغبار، افحص فلتر الهواء كل 5000 كم بدل الانتظار للموعد المعتاد — الفلتر المسدود يرفع استهلاك الوقود.',
      bodyEn:
        'During dusty season, inspect the air filter every 5,000 km instead of waiting for the usual interval — a clogged filter raises fuel consumption.',
      category: 'engine',
      conditions: ['dusty-season'],
    },
    {
      id: 'seed-tip-corolla-oil',
      titleAr: 'الزيت المناسب لكورولا في الحر',
      titleEn: 'The right oil for your Corolla in the heat',
      bodyAr:
        'لمحركات كورولا 2014–2019 في المناخ الحار، يُنصح بزيت تخليقي كامل 5W-30 مع تغييره كل 10000 كم أو 6 أشهر.',
      bodyEn:
        'For 2014–2019 Corolla engines in hot climates, full-synthetic 5W-30 is recommended, changed every 10,000 km or 6 months.',
      category: 'engine',
      conditions: ['summer-heat'],
      makeId: toyota.makeId,
      modelId: toyota.models['corolla'],
      yearFrom: 2014,
      yearTo: 2019,
    },
  ];

  for (const tip of tips) {
    const { id, ...data } = tip;
    await prisma.careTip.upsert({ where: { id }, update: {}, create: { id, ...data } });
  }
}

async function main(): Promise<void> {
  const catalog = await seedVehicleCatalog();
  const maintenanceItems = await seedMaintenanceItems();
  await seedServices();
  const users = await seedUsers();
  await seedVehicles(users, catalog, maintenanceItems);
  await seedProducts(catalog);
  await seedCareTips(catalog);

  const counts = {
    makes: await prisma.vehicleMake.count(),
    models: await prisma.vehicleModel.count(),
    maintenanceItems: await prisma.maintenanceItem.count(),
    services: await prisma.service.count(),
    users: await prisma.user.count(),
    addresses: await prisma.address.count(),
    vehicles: await prisma.vehicle.count(),
    maintenanceRecords: await prisma.vehicleMaintenanceRecord.count(),
    products: await prisma.product.count(),
    careTips: await prisma.careTip.count(),
  };
  console.log('Seed complete:', counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
