/**
 * Wipe the Travelia database and fill it with realistic demo data.
 *
 * Usage:
 *   npm run seed:demo
 *
 * Demo logins (password for all: Traveler123!):
 *   admin@travelia.local / Admin123!
 *   layla@example.com
 *   marco@example.com
 *   sofia@example.com
 *   kenji@example.com
 *   amira@example.com
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

function daysFromNow(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days) {
  return daysFromNow(-days);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pick(arr, i) {
  return arr[i % arr.length];
}

const CATEGORIES = [
  { name: "Beach", slug: "beach", icon: "beach", description: "Sun, sand, and sea." },
  { name: "Mountain", slug: "mountain", icon: "mountain", description: "Peaks and trails." },
  { name: "City", slug: "city", icon: "city", description: "Urban escapes." },
  { name: "Island", slug: "island", icon: "island", description: "Island getaways." },
  { name: "Cultural", slug: "cultural", icon: "cultural", description: "Heritage and museums." },
  { name: "Nature", slug: "nature", icon: "nature", description: "Wild landscapes." },
];

const MOODS = [
  { name: "Romantic", slug: "romantic", icon: "romantic", description: "For two." },
  { name: "Relaxation", slug: "relaxation", icon: "relaxation", description: "Slow days." },
  { name: "Adventure", slug: "adventure", icon: "adventure", description: "Thrill seekers." },
  { name: "Family", slug: "family", icon: "family", description: "Kid-friendly." },
  { name: "Solo", slug: "solo", icon: "solo", description: "Travel alone." },
];

const DESTINATIONS = [
  {
    title: "Santorini",
    country: "Greece",
    city: "Oia",
    lat: 36.4618,
    lng: 25.3753,
    description:
      "Whitewashed cliffs, cobalt domes, and sunset caldera views. Wander narrow lanes, taste Assyrtiko wines, and linger over Aegean evenings that feel endless.",
    categorySlug: "island",
    moodSlugs: ["romantic", "relaxation"],
    thumbnail: "/images/dest2.jpg",
    gallery: ["/images/dest2.jpg", "/images/dest3.jpg", "/images/dest4.jpg", "/images/dest5.jpg"],
    estimatedBudget: 1200,
    recommendedDays: 5,
    bestSeason: "Summer",
    capacity: 80,
    address: "Oia, Santorini, Cyclades, Greece",
    activities: [
      { title: "Oia Sunset Walk", description: "Guided cliffside stroll timed for caldera sunset.", duration: 90, price: 0, category: "relaxation", image: "/images/dest3.jpg", capacity: 30, location: "Oia Castle" },
      { title: "Caldera Boat Tour", description: "Half-day sail with swimming stops.", duration: 240, price: 90, category: "adventure", image: "/images/dest4.jpg", capacity: 24, location: "Ammoudi Bay" },
      { title: "Winery Tasting", description: "Assyrtiko tasting with panoramic views.", duration: 120, price: 55, category: "food", image: "/images/dest5.jpg", capacity: 16, location: "Santo Wines" },
    ],
    packages: [
      { title: "Sunset Week", departInDays: 14, nights: 4, capacity: 20, price: 520, guideIncluded: true },
      { title: "Late Summer Escape", departInDays: 28, nights: 3, capacity: 18, price: 480, guideIncluded: true },
    ],
  },
  {
    title: "Amalfi Coast",
    country: "Italy",
    city: "Positano",
    lat: 40.6281,
    lng: 14.485,
    description:
      "Lemon groves, pastel harbors, and cliff roads above turquoise water. Eat well, swim often, and let the Italian south set the pace.",
    categorySlug: "beach",
    moodSlugs: ["romantic", "family"],
    thumbnail: "/images/dest6.jpg",
    gallery: ["/images/dest6.jpg", "/images/dest7.jpg", "/images/dest8.jpg", "/images/dest9.jpg"],
    estimatedBudget: 1400,
    recommendedDays: 6,
    bestSeason: "Spring",
    capacity: 60,
    address: "Positano, Salerno, Italy",
    activities: [
      { title: "Path of the Gods Hike", description: "Cliff trail with Capri views.", duration: 210, price: 45, category: "adventure", image: "/images/dest7.jpg", capacity: 20, location: "Bomerano" },
      { title: "Positano Beach Day", description: "Swim at Spiaggia Grande.", duration: 180, price: 0, category: "relaxation", image: "/images/dest8.jpg", capacity: 40, location: "Spiaggia Grande" },
      { title: "Limoncello Workshop", description: "Bottling with a local family.", duration: 90, price: 40, category: "food", image: "/images/dest9.jpg", capacity: 12, location: "Positano" },
    ],
    packages: [
      { title: "Coastal Classic", departInDays: 21, nights: 5, capacity: 16, price: 720, guideIncluded: true },
      { title: "Spring Blooms", departInDays: 40, nights: 4, capacity: 14, price: 650, guideIncluded: false },
    ],
  },
  {
    title: "Kyoto",
    country: "Japan",
    city: "Kyoto",
    lat: 35.0116,
    lng: 135.7681,
    description:
      "Temples in mist, bamboo hush, and tea houses behind wooden doors. Kyoto rewards slow mornings and quiet curiosity.",
    categorySlug: "cultural",
    moodSlugs: ["solo", "relaxation"],
    thumbnail: "/images/dest10.jpg",
    gallery: ["/images/dest10.jpg", "/images/dest11.jpg", "/images/dest12.jpg", "/images/dest13.jpg"],
    estimatedBudget: 1100,
    recommendedDays: 5,
    bestSeason: "Autumn",
    capacity: 70,
    address: "Higashiyama, Kyoto, Japan",
    activities: [
      { title: "Arashiyama Bamboo Walk", description: "Early bamboo grove visit.", duration: 120, price: 25, category: "nature", image: "/images/dest11.jpg", capacity: 25, location: "Arashiyama" },
      { title: "Tea Ceremony", description: "Matcha in a historic machiya.", duration: 75, price: 60, category: "culture", image: "/images/dest12.jpg", capacity: 10, location: "Gion" },
      { title: "Fushimi Inari Sunrise", description: "Torii gates at first light.", duration: 150, price: 35, category: "culture", image: "/images/dest13.jpg", capacity: 18, location: "Fushimi Inari" },
    ],
    packages: [
      { title: "Temple Trail", departInDays: 18, nights: 4, capacity: 22, price: 890, guideIncluded: true },
      { title: "Maple Season", departInDays: -20, nights: 5, capacity: 15, price: 980, guideIncluded: true },
    ],
  },
  {
    title: "Banff",
    country: "Canada",
    city: "Banff",
    lat: 51.1784,
    lng: -115.5708,
    description:
      "Turquoise lakes, granite peaks, and pine air that wakes you up. Banff is for hikers, photographers, and anyone chasing big sky.",
    categorySlug: "mountain",
    moodSlugs: ["adventure", "family"],
    thumbnail: "/images/dest14.jpg",
    gallery: ["/images/dest14.jpg", "/images/dest15.jpg", "/images/dest16.jpg", "/images/dest2.jpg"],
    estimatedBudget: 1300,
    recommendedDays: 7,
    bestSeason: "Summer",
    capacity: 50,
    address: "Banff National Park, Alberta, Canada",
    activities: [
      { title: "Lake Louise Morning", description: "Lakeside walk and photo stop.", duration: 150, price: 30, category: "nature", image: "/images/dest15.jpg", capacity: 28, location: "Lake Louise" },
      { title: "Johnston Canyon Falls", description: "Canyon trail to the falls.", duration: 180, price: 40, category: "adventure", image: "/images/dest16.jpg", capacity: 22, location: "Johnston Canyon" },
      { title: "Banff Hot Springs", description: "Mineral pools after the trails.", duration: 90, price: 20, category: "relaxation", image: "/images/dest14.jpg", capacity: 35, location: "Upper Hot Springs" },
    ],
    packages: [
      { title: "Rockies Week", departInDays: 25, nights: 6, capacity: 18, price: 1100, guideIncluded: true },
      { title: "Peak Weekend", departInDays: -5, nights: 3, capacity: 12, price: 620, guideIncluded: false },
    ],
  },
  {
    title: "Marrakech",
    country: "Morocco",
    city: "Marrakech",
    lat: 31.6295,
    lng: -7.9811,
    description:
      "Spice markets, riad courtyards, and Atlas light at dusk. Lose yourself in the medina, then find calm on a rooftop mint tea.",
    categorySlug: "city",
    moodSlugs: ["adventure", "solo"],
    thumbnail: "/images/dest8.jpg",
    gallery: ["/images/dest8.jpg", "/images/dest9.jpg", "/images/dest10.jpg", "/images/dest11.jpg"],
    estimatedBudget: 900,
    recommendedDays: 4,
    bestSeason: "Spring",
    capacity: 55,
    address: "Medina, Marrakech, Morocco",
    activities: [
      { title: "Medina Food Walk", description: "Street snacks with a local guide.", duration: 180, price: 48, category: "food", image: "/images/dest9.jpg", capacity: 14, location: "Jemaa el-Fnaa" },
      { title: "Majorelle Garden Visit", description: "Yves Saint Laurent’s blue garden.", duration: 90, price: 18, category: "culture", image: "/images/dest10.jpg", capacity: 30, location: "Jardin Majorelle" },
      { title: "Atlas Day Trip", description: "Mountain villages and Berber tea.", duration: 480, price: 95, category: "adventure", image: "/images/dest11.jpg", capacity: 16, location: "Ourika Valley" },
    ],
    packages: [
      { title: "Medina Nights", departInDays: 16, nights: 3, capacity: 20, price: 420, guideIncluded: true },
      { title: "Desert Edge", departInDays: 45, nights: 4, capacity: 14, price: 560, guideIncluded: true },
    ],
  },
  {
    title: "Bali",
    country: "Indonesia",
    city: "Ubud",
    lat: -8.5069,
    lng: 115.2625,
    description:
      "Rice terraces, temple incense, and warm rain on palm leaves. Bali mixes stillness with adventure — from surf to spa.",
    categorySlug: "nature",
    moodSlugs: ["relaxation", "adventure"],
    thumbnail: "/images/dest12.jpg",
    gallery: ["/images/dest12.jpg", "/images/dest13.jpg", "/images/dest14.jpg", "/images/dest15.jpg"],
    estimatedBudget: 850,
    recommendedDays: 7,
    bestSeason: "Dry season",
    capacity: 90,
    address: "Ubud, Gianyar, Bali, Indonesia",
    activities: [
      { title: "Tegallalang Sunrise", description: "Rice terrace walk at dawn.", duration: 120, price: 22, category: "nature", image: "/images/dest13.jpg", capacity: 26, location: "Tegallalang" },
      { title: "Balinese Cooking Class", description: "Market shop then cook a full meal.", duration: 210, price: 55, category: "food", image: "/images/dest14.jpg", capacity: 12, location: "Ubud" },
      { title: "Temple & Waterfall Circuit", description: "Tirta Empul and a nearby waterfall.", duration: 300, price: 70, category: "culture", image: "/images/dest15.jpg", capacity: 18, location: "Central Bali" },
    ],
    packages: [
      { title: "Ubud Soft Reset", departInDays: 12, nights: 6, capacity: 24, price: 690, guideIncluded: false },
      { title: "Island Circuit", departInDays: -40, nights: 7, capacity: 16, price: 820, guideIncluded: true },
    ],
  },
  {
    title: "Dubai",
    country: "United Arab Emirates",
    city: "Dubai",
    lat: 25.2048,
    lng: 55.2708,
    description:
      "Glass towers, desert dunes, and marina nights. Dubai is bold, polished, and perfect for a long weekend of contrasts.",
    categorySlug: "city",
    moodSlugs: ["adventure", "family"],
    thumbnail: "/images/dest3.jpg",
    gallery: ["/images/dest3.jpg", "/images/dest4.jpg", "/images/dest5.jpg", "/images/dest6.jpg"],
    estimatedBudget: 1600,
    recommendedDays: 4,
    bestSeason: "Winter",
    capacity: 100,
    address: "Downtown Dubai, UAE",
    activities: [
      { title: "Desert Safari", description: "Dune buggy and sunset camp.", duration: 300, price: 110, category: "adventure", image: "/images/dest4.jpg", capacity: 20, location: "Al Marmoom" },
      { title: "Old Dubai Walking Tour", description: "Souks, creek abra, and spice lanes.", duration: 150, price: 35, category: "culture", image: "/images/dest5.jpg", capacity: 22, location: "Deira" },
    ],
    packages: [
      { title: "Skyline Weekend", departInDays: 10, nights: 3, capacity: 30, price: 780, guideIncluded: true },
    ],
  },
  {
    title: "Beirut",
    country: "Lebanon",
    city: "Beirut",
    lat: 33.8938,
    lng: 35.5018,
    description:
      "Corniche walks, mountain day trips, and a food scene that never sleeps. Beirut is layered, lively, and unforgettable.",
    categorySlug: "city",
    moodSlugs: ["solo", "adventure"],
    thumbnail: "/images/dest7.jpg",
    gallery: ["/images/dest7.jpg", "/images/dest8.jpg", "/images/dest9.jpg", "/images/dest10.jpg"],
    estimatedBudget: 700,
    recommendedDays: 4,
    bestSeason: "Spring",
    capacity: 45,
    address: "Hamra, Beirut, Lebanon",
    activities: [
      { title: "Downtown Heritage Walk", description: "Roman baths to modern neighborhoods.", duration: 120, price: 28, category: "culture", image: "/images/dest8.jpg", capacity: 18, location: "Downtown" },
      { title: "Jeita Grotto Day", description: "Cave boat and mountain lunch.", duration: 360, price: 65, category: "nature", image: "/images/dest9.jpg", capacity: 16, location: "Jeita" },
    ],
    packages: [
      { title: "Levant Long Weekend", departInDays: 8, nights: 3, capacity: 18, price: 390, guideIncluded: true },
      { title: "Coast & Mountains", departInDays: 33, nights: 4, capacity: 12, price: 480, guideIncluded: false },
    ],
  },
];

const TRAVELERS = [
  {
    firstName: "Layla",
    lastName: "Haddad",
    email: "layla@example.com",
    country: "Lebanon",
    bio: "Slow travel, strong coffee, cliffside sunsets.",
    phone: "+96170111222",
    nationality: "Lebanese",
    passportNumber: "LR4829103",
  },
  {
    firstName: "Marco",
    lastName: "Rossi",
    email: "marco@example.com",
    country: "Italy",
    bio: "Food first, flights second. Always packing light.",
    phone: "+393331234567",
    nationality: "Italian",
    passportNumber: "YA9382716",
  },
  {
    firstName: "Sofia",
    lastName: "Nguyen",
    email: "sofia@example.com",
    country: "Canada",
    bio: "Journaling every trip — mountains preferred.",
    phone: "+14165550198",
    nationality: "Canadian",
    passportNumber: "AT5520189",
  },
  {
    firstName: "Kenji",
    lastName: "Tanaka",
    email: "kenji@example.com",
    country: "Japan",
    bio: "Temple mornings and night markets.",
    phone: "+819012345678",
    nationality: "Japanese",
    passportNumber: "TS7812045",
  },
  {
    firstName: "Amira",
    lastName: "Benali",
    email: "amira@example.com",
    country: "Morocco",
    bio: "Chasing markets, mosaics, and mint tea.",
    phone: "+212661998877",
    nationality: "Moroccan",
    passportNumber: "MB3301847",
  },
];

const COLLECTIONS_TO_WIPE = [
  "users",
  "categories",
  "moods",
  "destinations",
  "activities",
  "trippackages",
  "bookings",
  "payments",
  "trips",
  "tripjournals",
  "trip_journals",
  "checklists",
  "expenses",
  "reviews",
  "favorites",
  "notifications",
  "visitedplaces",
  "announcements",
  "emailverificationtokens",
  "passwordresettokens",
  "accounts",
  "sessions",
  "verification_tokens",
];

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db();
  const now = new Date();

  console.log("Wiping collections…");
  for (const name of COLLECTIONS_TO_WIPE) {
    const exists = await db.listCollections({ name }).hasNext();
    if (exists) {
      await db.collection(name).deleteMany({});
      console.log(`  cleared ${name}`);
    }
  }

  const passwordHash = await bcrypt.hash("Traveler123!", 12);
  const adminHash = await bcrypt.hash("Admin123!", 12);

  const usersCol = db.collection("users");
  const adminId = new ObjectId();
  await usersCol.insertOne({
    _id: adminId,
    firstName: "Travelia",
    lastName: "Admin",
    email: "admin@travelia.local",
    password: adminHash,
    role: "ADMIN",
    emailVerified: true,
    provider: "credentials",
    status: "active",
    isVerified: true,
    verificationStatus: "verified",
    verifiedAt: now,
    verifiedBy: adminId,
    image: null,
    country: "Lebanon",
    bio: "Keeping Travelia flights on time.",
    createdAt: now,
    updatedAt: now,
  });
  console.log("Admin: admin@travelia.local / Admin123!");

  const travelerIds = [];
  for (const t of TRAVELERS) {
    const id = new ObjectId();
    travelerIds.push(id);
    await usersCol.insertOne({
      _id: id,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      password: passwordHash,
      phone: t.phone,
      country: t.country,
      bio: t.bio,
      role: "TRAVELER",
      emailVerified: true,
      provider: "credentials",
      status: "active",
      isVerified: true,
      verificationStatus: "verified",
      verifiedAt: daysAgo(20),
      verifiedBy: adminId,
      passport: {
        fullName: `${t.firstName} ${t.lastName}`,
        nationality: t.nationality,
        passportNumber: t.passportNumber,
        passportExpiry: daysFromNow(800),
        passportImage: "/images/dest2.jpg",
      },
      image: null,
      createdAt: daysAgo(60),
      updatedAt: now,
    });
  }
  console.log(`Travelers: ${TRAVELERS.length} (password Traveler123!)`);

  const categoriesCol = db.collection("categories");
  const moodsCol = db.collection("moods");
  const categoryIds = {};
  const moodIds = {};
  for (const c of CATEGORIES) {
    const id = new ObjectId();
    categoryIds[c.slug] = id;
    await categoriesCol.insertOne({
      _id: id,
      ...c,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const m of MOODS) {
    const id = new ObjectId();
    moodIds[m.slug] = id;
    await moodsCol.insertOne({
      _id: id,
      ...m,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  const destinationsCol = db.collection("destinations");
  const activitiesCol = db.collection("activities");
  const packagesCol = db.collection("trippackages");
  const destRecords = [];

  for (const dest of DESTINATIONS) {
    const destinationId = new ObjectId();
    const slug = slugify(dest.title);
    const activities = [];
    const packages = [];

    for (const act of dest.activities) {
      const activityId = new ObjectId();
      activities.push({ id: activityId, ...act });
      await activitiesCol.insertOne({
        _id: activityId,
        destinationId,
        title: act.title,
        description: act.description,
        duration: act.duration,
        price: act.price,
        location: act.location || null,
        image: act.image,
        category: act.category,
        openingHours: "09:00–18:00",
        capacity: act.capacity,
        bookedCount: Math.floor(act.capacity * 0.2),
        isAvailable: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const pkg of dest.packages) {
      const packageId = new ObjectId();
      const departureDate = daysFromNow(pkg.departInDays);
      const returnDate = daysFromNow(pkg.departInDays + pkg.nights);
      const bookedCount = Math.min(
        pkg.capacity - 2,
        Math.max(1, Math.floor(pkg.capacity * 0.35))
      );
      packages.push({
        id: packageId,
        ...pkg,
        departureDate,
        returnDate,
        bookedCount,
      });
      await packagesCol.insertOne({
        _id: packageId,
        destinationId,
        title: pkg.title,
        departureDate,
        returnDate,
        capacity: pkg.capacity,
        bookedCount,
        price: pkg.price,
        currency: "USD",
        guideIncluded: pkg.guideIncluded,
        status: departureDate < now ? "closed" : "open",
        isPublished: true,
        notes: null,
        createdBy: adminId,
        createdAt: now,
        updatedAt: now,
      });
    }

    const reviewCount = 18 + Math.floor(Math.random() * 40);
    const ratingAverage = Number((4.2 + Math.random() * 0.7).toFixed(1));
    const bookedCount = packages.reduce((s, p) => s + p.bookedCount, 0);

    await destinationsCol.insertOne({
      _id: destinationId,
      title: dest.title,
      slug,
      description: dest.description,
      country: dest.country,
      city: dest.city,
      address: dest.address,
      thumbnail: dest.thumbnail,
      gallery: dest.gallery,
      latitude: dest.lat,
      longitude: dest.lng,
      estimatedBudget: dest.estimatedBudget,
      recommendedDays: dest.recommendedDays,
      bestSeason: dest.bestSeason,
      ratingAverage,
      reviewCount,
      capacity: dest.capacity,
      bookedCount: Math.min(dest.capacity - 5, bookedCount),
      requiresTravelDocuments: true,
      visaRequired: !["Canada", "Italy", "Japan"].includes(dest.country),
      visaGuidance:
        "Check entry rules for your nationality. Verified passport speeds booking.",
      categoryId: categoryIds[dest.categorySlug],
      moodIds: dest.moodSlugs.map((s) => moodIds[s]).filter(Boolean),
      isPublished: true,
      createdBy: adminId,
      createdAt: daysAgo(90),
      updatedAt: now,
    });

    destRecords.push({
      id: destinationId,
      ...dest,
      slug,
      activities,
      packages,
      ratingAverage,
      reviewCount,
    });
  }
  console.log(`Destinations: ${destRecords.length}`);

  const bookingsCol = db.collection("bookings");
  const paymentsCol = db.collection("payments");
  const tripsCol = db.collection("trips");
  const journalsCol = db.collection("tripjournals");
  const checklistsCol = db.collection("checklists");
  const expensesCol = db.collection("expenses");
  const reviewsCol = db.collection("reviews");
  const favoritesCol = db.collection("favorites");
  const notificationsCol = db.collection("notifications");
  const visitedCol = db.collection("visitedplaces");
  const announcementsCol = db.collection("announcements");

  let bookingCount = 0;
  let tripCount = 0;
  let reviewCount = 0;

  for (let i = 0; i < travelerIds.length; i++) {
    const userId = travelerIds[i];
    const traveler = TRAVELERS[i];
    const destA = pick(destRecords, i);
    const destB = pick(destRecords, i + 3);
    const pkgA = pick(destA.packages, 0);
    const pkgB = pick(destB.packages, 0);

    // Favorites
    for (const d of [destA, destB, pick(destRecords, i + 1)]) {
      await favoritesCol.insertOne({
        userId,
        destinationId: d.id,
        createdAt: daysAgo(10 + i),
        updatedAt: now,
      });
    }

    // Upcoming confirmed booking + trip
    const upcomingBookingId = new ObjectId();
    const upcomingTripId = new ObjectId();
    const upcomingStart = pkgA.departureDate;
    const upcomingEnd = pkgA.returnDate;
    const upcomingStatus =
      upcomingStart > now
        ? "upcoming"
        : upcomingEnd < now
          ? "completed"
          : "ongoing";

    await bookingsCol.insertOne({
      _id: upcomingBookingId,
      userId,
      destinationId: destA.id,
      tripPackageId: pkgA.id,
      activityId: destA.activities[0]?.id ?? null,
      tripId: upcomingTripId,
      bookingDate: daysAgo(12),
      travelDate: upcomingStart,
      price: pkgA.price + (destA.activities[0]?.price || 0),
      currency: "USD",
      status: upcomingStatus === "completed" ? "completed" : "confirmed",
      paymentStatus: "paid",
      usePassportDetails: true,
      travelerPassport: {
        fullName: `${traveler.firstName} ${traveler.lastName}`,
        nationality: traveler.nationality,
        passportNumber: traveler.passportNumber,
        passportExpiry: daysFromNow(800),
        passportImage: "/images/dest2.jpg",
      },
      notes: "Window seat if possible",
      createdAt: daysAgo(12),
      updatedAt: now,
    });
    bookingCount += 1;

    await paymentsCol.insertOne({
      bookingId: upcomingBookingId,
      bookingIds: [upcomingBookingId],
      userId,
      amount: pkgA.price + (destA.activities[0]?.price || 0),
      currency: "USD",
      paymentMethod: "card",
      status: "completed",
      transactionId: `demo_txn_${upcomingBookingId.toString().slice(-8)}`,
      provider: "demo",
      paidAt: daysAgo(11),
      createdAt: daysAgo(11),
      updatedAt: now,
    });

    const dayCount = Math.max(
      1,
      Math.round((upcomingEnd - upcomingStart) / (1000 * 60 * 60 * 24)) + 1
    );
    const days = [];
    for (let d = 0; d < Math.min(dayCount, 5); d++) {
      const date = new Date(upcomingStart);
      date.setDate(date.getDate() + d);
      days.push({
        _id: new ObjectId(),
        date,
        notes: d === 0 ? "Arrive and settle in" : null,
        stops: [
          {
            _id: new ObjectId(),
            title: d === 0 ? "Hotel check-in" : pick(destA.activities, d).title,
            notes: null,
            startTime: d === 0 ? "15:00" : "10:00",
            reminderAt: null,
            reminderText: null,
            completed: upcomingStatus !== "upcoming",
            order: 0,
          },
        ],
        journal:
          upcomingStatus === "completed" || upcomingStatus === "ongoing"
            ? {
                photos: [destA.thumbnail],
                memory:
                  d === 0
                    ? `First evening in ${destA.city} — already worth the flight.`
                    : `Day ${d + 1}: slow morning, long walk, perfect light.`,
                mood: pick(["happy", "relaxed", "adventurous", "grateful"], d),
                rating: 4 + (d % 2),
                places: [
                  {
                    _id: new ObjectId(),
                    name: destA.city,
                    note: "Pin for later",
                    lat: destA.lat,
                    lng: destA.lng,
                  },
                ],
              }
            : { photos: [], memory: null, mood: null, rating: null, places: [] },
      });
    }

    await tripsCol.insertOne({
      _id: upcomingTripId,
      userId,
      destinationId: destA.id,
      title: `${destA.title} · ${traveler.firstName}`,
      description: `Personal trip to ${destA.city}`,
      coverImage: destA.thumbnail,
      startDate: upcomingStart,
      endDate: upcomingEnd,
      status: upcomingStatus,
      totalBudget: destA.estimatedBudget,
      estimatedCost: pkgA.price,
      days,
      createdAt: daysAgo(12),
      updatedAt: now,
    });
    tripCount += 1;

    await checklistsCol.insertOne({
      userId,
      tripId: upcomingTripId,
      title: "Packing list",
      items: [
        { _id: new ObjectId(), text: "Passport", completed: true },
        { _id: new ObjectId(), text: "Charger + adapter", completed: true },
        { _id: new ObjectId(), text: "Travel insurance PDF", completed: false },
        { _id: new ObjectId(), text: "Comfortable walking shoes", completed: false },
        { _id: new ObjectId(), text: "Meds / first aid", completed: false },
      ],
      createdAt: daysAgo(10),
      updatedAt: now,
    });

    await expensesCol.insertMany([
      {
        userId,
        tripId: upcomingTripId,
        title: "Flights",
        amount: Math.round(pkgA.price * 0.55),
        currency: "USD",
        category: "flight",
        date: daysAgo(9),
        createdAt: daysAgo(9),
        updatedAt: now,
      },
      {
        userId,
        tripId: upcomingTripId,
        title: "Hotel deposit",
        amount: Math.round(pkgA.price * 0.3),
        currency: "USD",
        category: "hotel",
        date: daysAgo(8),
        createdAt: daysAgo(8),
        updatedAt: now,
      },
      {
        userId,
        tripId: upcomingTripId,
        title: "Local SIM",
        amount: 25,
        currency: "USD",
        category: "other",
        date: daysAgo(2),
        createdAt: daysAgo(2),
        updatedAt: now,
      },
    ]);

    // Completed past trip on destB for journal / review / visited
    const pastPkg = destB.packages.find((p) => p.departureDate < now) || {
      ...pkgB,
      departureDate: daysAgo(45),
      returnDate: daysAgo(38),
      price: pkgB.price,
      id: pkgB.id,
    };
    const pastTripId = new ObjectId();
    const pastBookingId = new ObjectId();

    await bookingsCol.insertOne({
      _id: pastBookingId,
      userId,
      destinationId: destB.id,
      tripPackageId: pastPkg.id,
      activityId: null,
      tripId: pastTripId,
      bookingDate: daysAgo(60),
      travelDate: pastPkg.departureDate,
      price: pastPkg.price,
      currency: "USD",
      status: "completed",
      paymentStatus: "paid",
      usePassportDetails: true,
      travelerPassport: {
        fullName: `${traveler.firstName} ${traveler.lastName}`,
        nationality: traveler.nationality,
        passportNumber: traveler.passportNumber,
        passportExpiry: daysFromNow(800),
        passportImage: "/images/dest2.jpg",
      },
      notes: null,
      createdAt: daysAgo(60),
      updatedAt: now,
    });
    bookingCount += 1;

    await paymentsCol.insertOne({
      bookingId: pastBookingId,
      bookingIds: [pastBookingId],
      userId,
      amount: pastPkg.price,
      currency: "USD",
      paymentMethod: "card",
      status: "completed",
      transactionId: `demo_past_${pastBookingId.toString().slice(-8)}`,
      provider: "demo",
      paidAt: daysAgo(59),
      createdAt: daysAgo(59),
      updatedAt: now,
    });

    await tripsCol.insertOne({
      _id: pastTripId,
      userId,
      destinationId: destB.id,
      title: `${destB.title} memories`,
      description: `Completed trip to ${destB.city}`,
      coverImage: destB.thumbnail,
      startDate: pastPkg.departureDate,
      endDate: pastPkg.returnDate,
      status: "completed",
      totalBudget: destB.estimatedBudget,
      estimatedCost: pastPkg.price,
      days: [
        {
          _id: new ObjectId(),
          date: pastPkg.departureDate,
          notes: "Landing day",
          stops: [
            {
              _id: new ObjectId(),
              title: "Airport transfer",
              notes: null,
              startTime: "14:00",
              reminderAt: null,
              reminderText: null,
              completed: true,
              order: 0,
            },
          ],
          journal: {
            photos: [destB.thumbnail, destB.gallery[1] || destB.thumbnail],
            memory: `${destB.city} felt like a film set — kept walking past midnight.`,
            mood: "happy",
            rating: 5,
            places: [
              {
                _id: new ObjectId(),
                name: destB.city,
                note: "Loved this corner",
                lat: destB.lat,
                lng: destB.lng,
              },
            ],
          },
        },
        {
          _id: new ObjectId(),
          date: daysFromNow(
            Math.round((pastPkg.returnDate - now) / 86400000) - 1
          ),
          notes: null,
          stops: [],
          journal: {
            photos: [destB.gallery[2] || destB.thumbnail],
            memory: "Last coffee before the airport. Already planning a return.",
            mood: "grateful",
            rating: 5,
            places: [],
          },
        },
      ],
      createdAt: daysAgo(60),
      updatedAt: now,
    });
    tripCount += 1;

    const pastDayKey = pastPkg.departureDate.toISOString().slice(0, 10);
    await journalsCol.insertOne({
      userId,
      tripId: pastTripId,
      dayKey: pastDayKey,
      photos: [destB.thumbnail],
      memory: `Notebook page from ${destB.city}.`,
      mood: "relaxed",
      rating: 5,
      places: [
        {
          _id: new ObjectId(),
          name: destB.city,
          note: null,
          lat: destB.lat,
          lng: destB.lng,
        },
      ],
      createdAt: pastPkg.departureDate,
      updatedAt: now,
    });

    await reviewsCol.insertOne({
      userId,
      destinationId: destB.id,
      tripId: pastTripId,
      rating: 4 + (i % 2),
      comment: `${destB.title} exceeded expectations — especially the evenings. Would book again through Travelia.`,
      images: [destB.thumbnail],
      likes: 3 + i,
      isApproved: true,
      createdAt: daysAgo(30),
      updatedAt: now,
    });
    reviewCount += 1;

    await visitedCol.insertOne({
      userId,
      destinationId: destB.id,
      tripId: pastTripId,
      visitDate: pastPkg.returnDate,
      rating: 5,
      note: `Loved ${destB.city} — already planning a return.`,
      createdAt: pastPkg.returnDate,
      updatedAt: now,
    });

    await notificationsCol.insertMany([
      {
        userId,
        title: "Booking confirmed",
        message: `Your ${destA.title} departure is locked in. Pack light, dream big.`,
        type: "booking",
        link: "/dashboard/bookings",
        isRead: i % 2 === 0,
        expiresAt: daysFromNow(30),
        createdAt: daysAgo(11),
        updatedAt: now,
      },
      {
        userId,
        title: "Trip reminder",
        message: `${destA.city} is coming up — check your packing list.`,
        type: "trip",
        link: `/dashboard/trips/${upcomingTripId}`,
        isRead: false,
        expiresAt: daysFromNow(30),
        createdAt: daysAgo(2),
        updatedAt: now,
      },
    ]);
  }

  // Extra approved reviews (avoid user+destination duplicates)
  const reviewedPairs = new Set();
  for (let i = 0; i < travelerIds.length; i++) {
    const destB = pick(destRecords, i + 3);
    reviewedPairs.add(`${travelerIds[i].toString()}:${destB.id.toString()}`);
  }
  for (let i = 0; i < destRecords.length; i++) {
    const dest = destRecords[i];
    for (let t = 0; t < travelerIds.length; t++) {
      const userId = travelerIds[(i + t + 1) % travelerIds.length];
      const key = `${userId.toString()}:${dest.id.toString()}`;
      if (reviewedPairs.has(key)) continue;
      reviewedPairs.add(key);
      await reviewsCol.insertOne({
        userId,
        destinationId: dest.id,
        tripId: null,
        rating: 4 + ((i + t) % 2),
        comment: `Stunning stay in ${dest.city}. Travelia made booking effortless.`,
        images: [],
        likes: 1 + t,
        isApproved: true,
        createdAt: daysAgo(15 + i + t),
        updatedAt: now,
      });
      reviewCount += 1;
      break;
    }
  }

  await announcementsCol.insertMany([
    {
      title: "Spring flash fares",
      message:
        "This week only: featured Mediterranean departures with flexible dates. Browse Destinations and lock your seat.",
      audience: "TRAVELER",
      isActive: true,
      createdBy: adminId,
      sentCount: travelerIds.length,
      sentAt: daysAgo(1),
      createdAt: daysAgo(1),
      updatedAt: now,
    },
    {
      title: "Passport tip",
      message:
        "Verify your passport in Profile before checkout — it speeds every booking.",
      audience: "all",
      isActive: true,
      createdBy: adminId,
      sentCount: travelerIds.length,
      sentAt: daysAgo(3),
      createdAt: daysAgo(3),
      updatedAt: now,
    },
  ]);

  console.log(`Bookings: ${bookingCount}`);
  console.log(`Trips: ${tripCount}`);
  console.log(`Reviews: ${reviewCount}`);
  console.log("Announcements: 2");
  console.log("\nDemo ready.");
  console.log("  Admin:    admin@travelia.local / Admin123!");
  console.log("  Traveler: layla@example.com / Traveler123!");
  console.log("  Also:     marco@, sofia@, kenji@, amira@example.com");
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await client.close();
}
