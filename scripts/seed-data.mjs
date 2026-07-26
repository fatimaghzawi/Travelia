/**
 * Seed mock destinations, activities, categories, moods, and trip packages.
 * Uses images from public/images/dest*.jpg
 *
 * Usage:
 *   npm run seed:data
 *
 * Idempotent: re-running upserts by slug / package key.
 * Requires MONGODB_URI in .env.local or .env
 * Uses an existing ADMIN user as createdBy (runs seed:admin if needed).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { MongoClient, ObjectId } from "mongodb";

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
  console.error("Missing MONGODB_URI. Set it in .env.local");
  process.exit(1);
}

function daysFromNow(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

/** @type {Array<{
 *  title: string;
 *  country: string;
 *  city: string;
 *  description: string;
 *  categorySlug: string;
 *  moodSlugs: string[];
 *  thumbnail: string;
 *  gallery: string[];
 *  estimatedBudget: number;
 *  recommendedDays: number;
 *  bestSeason: string;
 *  capacity: number;
 *  address: string;
 *  activities: Array<{
 *    title: string;
 *    description: string;
 *    duration: number;
 *    price: number;
 *    category: string;
 *    image: string;
 *    capacity: number;
 *    location?: string;
 *  }>;
 *  packages: Array<{
 *    title: string;
 *    departInDays: number;
 *    nights: number;
 *    capacity: number;
 *    price: number;
 *    guideIncluded: boolean;
 *  }>;
 * }>} */
const DESTINATIONS = [
  {
    title: "Santorini",
    country: "Greece",
    city: "Oia",
    description:
      "Whitewashed cliffs, cobalt domes, and sunset caldera views. Wander narrow lanes, taste Assyrtiko wines, and linger over Aegean evenings that feel endless.",
    categorySlug: "island",
    moodSlugs: ["romantic", "relaxation"],
    thumbnail: "/images/dest2.jpg",
    gallery: [
      "/images/dest2.jpg",
      "/images/dest3.jpg",
      "/images/dest4.jpg",
      "/images/dest5.jpg",
    ],
    estimatedBudget: 1200,
    recommendedDays: 5,
    bestSeason: "Summer",
    capacity: 80,
    address: "Oia, Santorini, Cyclades, Greece",
    activities: [
      {
        title: "Oia Sunset Walk",
        description:
          "Guided stroll through Oia’s cliffside paths timed for the famous caldera sunset.",
        duration: 90,
        price: 0,
        category: "relaxation",
        image: "/images/dest3.jpg",
        capacity: 30,
        location: "Oia Castle viewpoint",
      },
      {
        title: "Caldera Boat Tour",
        description:
          "Half-day sail past the volcanic islets with swimming stops in warm Aegean water.",
        duration: 240,
        price: 90,
        category: "adventure",
        image: "/images/dest4.jpg",
        capacity: 24,
        location: "Ammoudi Bay",
      },
      {
        title: "Winery Tasting",
        description:
          "Sample local Assyrtiko at a cliffside winery with panoramic caldera views.",
        duration: 120,
        price: 55,
        category: "food",
        image: "/images/dest5.jpg",
        capacity: 16,
        location: "Santo Wines",
      },
    ],
    packages: [
      {
        title: "Sunset Week",
        departInDays: 14,
        nights: 3,
        capacity: 20,
        price: 500,
        guideIncluded: true,
      },
      {
        title: "Late Summer Escape",
        departInDays: 28,
        nights: 3,
        capacity: 18,
        price: 480,
        guideIncluded: true,
      },
      {
        title: "September Soft Light",
        departInDays: 50,
        nights: 3,
        capacity: 12,
        price: 450,
        guideIncluded: false,
      },
    ],
  },
  {
    title: "Amalfi Coast",
    country: "Italy",
    city: "Positano",
    description:
      "Lemon groves, pastel harbors, and cliff roads above turquoise water. Eat well, swim often, and let the Italian south set the pace.",
    categorySlug: "beach",
    moodSlugs: ["romantic", "family"],
    thumbnail: "/images/dest6.jpg",
    gallery: [
      "/images/dest6.jpg",
      "/images/dest7.jpg",
      "/images/dest8.jpg",
      "/images/dest9.jpg",
    ],
    estimatedBudget: 1400,
    recommendedDays: 6,
    bestSeason: "Spring",
    capacity: 60,
    address: "Positano, Salerno, Italy",
    activities: [
      {
        title: "Path of the Gods Hike",
        description:
          "Scenic cliff trail with views over Capri and the Amalfi coastline.",
        duration: 210,
        price: 45,
        category: "adventure",
        image: "/images/dest7.jpg",
        capacity: 20,
        location: "Bomerano trailhead",
      },
      {
        title: "Positano Beach Day",
        description:
          "Lounge and swim at Spiaggia Grande with optional boat transfer tips.",
        duration: 180,
        price: 0,
        category: "relaxation",
        image: "/images/dest8.jpg",
        capacity: 40,
        location: "Spiaggia Grande",
      },
      {
        title: "Limoncello Workshop",
        description:
          "Hands-on tasting and bottling experience with a local family producer.",
        duration: 90,
        price: 40,
        category: "food",
        image: "/images/dest9.jpg",
        capacity: 12,
        location: "Positano center",
      },
    ],
    packages: [
      {
        title: "Coastal Classic",
        departInDays: 21,
        nights: 5,
        capacity: 16,
        price: 720,
        guideIncluded: true,
      },
      {
        title: "Spring Blooms",
        departInDays: 40,
        nights: 4,
        capacity: 14,
        price: 650,
        guideIncluded: false,
      },
    ],
  },
  {
    title: "Kyoto",
    country: "Japan",
    city: "Kyoto",
    description:
      "Temples in mist, bamboo hush, and tea houses behind wooden doors. Kyoto rewards slow mornings and quiet curiosity.",
    categorySlug: "cultural",
    moodSlugs: ["solo", "relaxation"],
    thumbnail: "/images/dest10.jpg",
    gallery: [
      "/images/dest10.jpg",
      "/images/dest11.jpg",
      "/images/dest12.jpg",
      "/images/dest13.jpg",
    ],
    estimatedBudget: 1100,
    recommendedDays: 5,
    bestSeason: "Autumn",
    capacity: 70,
    address: "Higashiyama, Kyoto, Japan",
    activities: [
      {
        title: "Arashiyama Bamboo Walk",
        description:
          "Early visit to the bamboo grove before the crowds, with temple side stops.",
        duration: 120,
        price: 25,
        category: "nature",
        image: "/images/dest11.jpg",
        capacity: 25,
        location: "Arashiyama",
      },
      {
        title: "Tea Ceremony",
        description:
          "Traditional matcha ceremony in a historic machiya townhouse.",
        duration: 75,
        price: 60,
        category: "culture",
        image: "/images/dest12.jpg",
        capacity: 10,
        location: "Gion",
      },
      {
        title: "Fushimi Inari Sunrise",
        description:
          "Guided climb through the vermilion torii gates at first light.",
        duration: 150,
        price: 35,
        category: "culture",
        image: "/images/dest13.jpg",
        capacity: 18,
        location: "Fushimi Inari Taisha",
      },
    ],
    packages: [
      {
        title: "Temple Trail",
        departInDays: 18,
        nights: 4,
        capacity: 22,
        price: 890,
        guideIncluded: true,
      },
      {
        title: "Maple Season",
        departInDays: 60,
        nights: 5,
        capacity: 15,
        price: 980,
        guideIncluded: true,
      },
    ],
  },
  {
    title: "Banff",
    country: "Canada",
    city: "Banff",
    description:
      "Turquoise lakes, granite peaks, and pine air that wakes you up. Banff is for hikers, photographers, and anyone chasing big sky.",
    categorySlug: "mountain",
    moodSlugs: ["adventure", "family"],
    thumbnail: "/images/dest14.jpg",
    gallery: [
      "/images/dest14.jpg",
      "/images/dest15.jpg",
      "/images/dest16.jpg",
      "/images/dest2.jpg",
    ],
    estimatedBudget: 1300,
    recommendedDays: 7,
    bestSeason: "Summer",
    capacity: 50,
    address: "Banff National Park, Alberta, Canada",
    activities: [
      {
        title: "Lake Louise Morning",
        description:
          "Lakeside walk and photo stop with optional canoe rental guidance.",
        duration: 150,
        price: 30,
        category: "nature",
        image: "/images/dest15.jpg",
        capacity: 28,
        location: "Lake Louise",
      },
      {
        title: "Johnston Canyon Falls",
        description:
          "Easy canyon trail to Lower and Upper Falls with a park guide.",
        duration: 180,
        price: 40,
        category: "adventure",
        image: "/images/dest16.jpg",
        capacity: 22,
        location: "Johnston Canyon",
      },
      {
        title: "Banff Hot Springs",
        description:
          "Soak in mountain mineral pools after a day on the trails.",
        duration: 90,
        price: 20,
        category: "relaxation",
        image: "/images/dest14.jpg",
        capacity: 35,
        location: "Banff Upper Hot Springs",
      },
    ],
    packages: [
      {
        title: "Rockies Week",
        departInDays: 25,
        nights: 6,
        capacity: 18,
        price: 1100,
        guideIncluded: true,
      },
      {
        title: "Peak Weekend",
        departInDays: 35,
        nights: 3,
        capacity: 12,
        price: 620,
        guideIncluded: false,
      },
    ],
  },
  {
    title: "Marrakech",
    country: "Morocco",
    city: "Marrakech",
    description:
      "Spice markets, riad courtyards, and Atlas light at dusk. Lose yourself in the medina, then find calm on a rooftop mint tea.",
    categorySlug: "city",
    moodSlugs: ["adventure", "solo"],
    thumbnail: "/images/dest8.jpg",
    gallery: [
      "/images/dest8.jpg",
      "/images/dest9.jpg",
      "/images/dest10.jpg",
      "/images/dest11.jpg",
    ],
    estimatedBudget: 900,
    recommendedDays: 4,
    bestSeason: "Spring",
    capacity: 55,
    address: "Medina, Marrakech, Morocco",
    activities: [
      {
        title: "Medina Food Walk",
        description:
          "Taste street snacks and hidden kitchens with a local food guide.",
        duration: 180,
        price: 48,
        category: "food",
        image: "/images/dest9.jpg",
        capacity: 14,
        location: "Jemaa el-Fnaa",
      },
      {
        title: "Majorelle Garden Visit",
        description:
          "Timed entry to Yves Saint Laurent’s blue garden oasis.",
        duration: 90,
        price: 18,
        category: "culture",
        image: "/images/dest10.jpg",
        capacity: 30,
        location: "Jardin Majorelle",
      },
      {
        title: "Atlas Day Trip",
        description:
          "Mountain villages, Berber tea, and high valley viewpoints.",
        duration: 480,
        price: 95,
        category: "adventure",
        image: "/images/dest11.jpg",
        capacity: 16,
        location: "Ourika Valley",
      },
    ],
    packages: [
      {
        title: "Medina Nights",
        departInDays: 16,
        nights: 3,
        capacity: 20,
        price: 420,
        guideIncluded: true,
      },
      {
        title: "Desert Edge",
        departInDays: 45,
        nights: 4,
        capacity: 14,
        price: 560,
        guideIncluded: true,
      },
    ],
  },
  {
    title: "Bali",
    country: "Indonesia",
    city: "Ubud",
    description:
      "Rice terraces, temple incense, and warm rain on palm leaves. Bali mixes stillness with adventure — from surf to spa.",
    categorySlug: "nature",
    moodSlugs: ["relaxation", "adventure"],
    thumbnail: "/images/dest12.jpg",
    gallery: [
      "/images/dest12.jpg",
      "/images/dest13.jpg",
      "/images/dest14.jpg",
      "/images/dest15.jpg",
    ],
    estimatedBudget: 850,
    recommendedDays: 7,
    bestSeason: "Dry season",
    capacity: 90,
    address: "Ubud, Gianyar, Bali, Indonesia",
    activities: [
      {
        title: "Tegallalang Sunrise",
        description:
          "Rice terrace walk at dawn with optional photo tips from your host.",
        duration: 120,
        price: 22,
        category: "nature",
        image: "/images/dest13.jpg",
        capacity: 26,
        location: "Tegallalang",
      },
      {
        title: "Balinese Cooking Class",
        description:
          "Market shop then cook a full meal in a family compound kitchen.",
        duration: 210,
        price: 55,
        category: "food",
        image: "/images/dest14.jpg",
        capacity: 12,
        location: "Ubud outskirts",
      },
      {
        title: "Temple & Waterfall Circuit",
        description:
          "Visit Tirta Empul and a nearby waterfall with a local driver-guide.",
        duration: 300,
        price: 70,
        category: "culture",
        image: "/images/dest15.jpg",
        capacity: 18,
        location: "Central Bali",
      },
    ],
    packages: [
      {
        title: "Ubud Soft Reset",
        departInDays: 12,
        nights: 6,
        capacity: 24,
        price: 690,
        guideIncluded: false,
      },
      {
        title: "Island Circuit",
        departInDays: 32,
        nights: 7,
        capacity: 16,
        price: 820,
        guideIncluded: true,
      },
    ],
  },
];

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db();
  const now = new Date();

  const users = db.collection("users");
  let admin = await users.findOne({ role: "ADMIN" });
  if (!admin) {
    console.log("No ADMIN found — create one with: npm run seed:admin");
    process.exit(1);
  }
  const createdBy = admin._id;
  console.log(`Using admin createdBy: ${admin.email}`);

  const categoriesCol = db.collection("categories");
  const moodsCol = db.collection("moods");
  const destinationsCol = db.collection("destinations");
  const activitiesCol = db.collection("activities");
  const packagesCol = db.collection("trippackages");

  const categoryIds = {};
  for (const c of CATEGORIES) {
    const res = await categoriesCol.findOneAndUpdate(
      { slug: c.slug },
      {
        $set: {
          name: c.name,
          slug: c.slug,
          icon: c.icon,
          description: c.description,
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" }
    );
    categoryIds[c.slug] = res._id;
  }
  console.log(`Categories: ${CATEGORIES.length}`);

  const moodIds = {};
  for (const m of MOODS) {
    const res = await moodsCol.findOneAndUpdate(
      { slug: m.slug },
      {
        $set: {
          name: m.name,
          slug: m.slug,
          icon: m.icon,
          description: m.description,
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" }
    );
    moodIds[m.slug] = res._id;
  }
  console.log(`Moods: ${MOODS.length}`);

  let destCount = 0;
  let activityCount = 0;
  let packageCount = 0;

  for (const dest of DESTINATIONS) {
    const slug = slugify(dest.title);
    const categoryId = categoryIds[dest.categorySlug];
    const moodObjectIds = dest.moodSlugs.map((s) => moodIds[s]).filter(Boolean);

    const destDoc = {
      title: dest.title,
      slug,
      description: dest.description,
      country: dest.country,
      city: dest.city,
      address: dest.address,
      thumbnail: dest.thumbnail,
      gallery: dest.gallery,
      estimatedBudget: dest.estimatedBudget,
      recommendedDays: dest.recommendedDays,
      bestSeason: dest.bestSeason,
      ratingAverage: 4.7,
      reviewCount: 1250,
      capacity: dest.capacity,
      bookedCount: 0,
      requiresTravelDocuments: true,
      visaRequired: dest.country !== "Canada" && dest.country !== "Italy",
      visaGuidance:
        "Check entry rules for your nationality before travel. Passport verification speeds up booking.",
      categoryId,
      moodIds: moodObjectIds,
      isPublished: true,
      createdBy,
      updatedAt: now,
    };

    const upserted = await destinationsCol.findOneAndUpdate(
      { slug },
      { $set: destDoc, $setOnInsert: { createdAt: now } },
      { upsert: true, returnDocument: "after" }
    );
    const destinationId = upserted._id;
    destCount += 1;

    // Replace activities for this destination (by title) so re-seed stays clean
    for (const act of dest.activities) {
      await activitiesCol.findOneAndUpdate(
        { destinationId, title: act.title },
        {
          $set: {
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
            bookedCount: 0,
            isAvailable: true,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );
      activityCount += 1;
    }

    for (const pkg of dest.packages) {
      const departureDate = daysFromNow(pkg.departInDays);
      const returnDate = daysFromNow(pkg.departInDays + pkg.nights);
      const packageKey = `${slug}-${pkg.title}`;

      await packagesCol.findOneAndUpdate(
        {
          destinationId,
          title: pkg.title,
        },
        {
          $set: {
            destinationId,
            title: pkg.title,
            departureDate,
            returnDate,
            capacity: pkg.capacity,
            bookedCount: 0,
            price: pkg.price,
            currency: "USD",
            guideIncluded: pkg.guideIncluded,
            status: "open",
            isPublished: true,
            notes: packageKey,
            createdBy,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );
      packageCount += 1;
    }
  }

  console.log(`Destinations: ${destCount}`);
  console.log(`Activities: ${activityCount}`);
  console.log(`Trip packages: ${packageCount}`);
  console.log("Done. Open /destinations to browse mock data.");
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await client.close();
}
