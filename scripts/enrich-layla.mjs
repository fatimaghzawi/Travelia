/**
 * Enrich Layla's trips with people photos, a full journey, checklists, and expenses.
 *
 * Usage: node scripts/enrich-layla.mjs
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
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const PPL = [
  "/images/ppl11.PNG",
  "/images/ppl22.PNG",
  "/images/ppl33.PNG",
  "/images/ppl44.PNG",
  "/images/ppl555.PNG",
  "/images/ppl666.PNG",
];

function dayKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function utcDay(base, offsetDays) {
  const d = new Date(base);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offsetDays, 12)
  );
}

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db();
  const now = new Date();

  const layla = await db.collection("users").findOne({ email: "layla@example.com" });
  if (!layla) {
    console.error("Layla not found — run npm run seed:demo first");
    process.exit(1);
  }
  const userId = layla._id;

  await db.collection("users").updateOne(
    { _id: userId },
    {
      $set: {
        image: PPL[0],
        bio: "Slow travel, strong coffee, cliffside sunsets. Collecting faces and places.",
        updatedAt: now,
      },
    }
  );

  const trips = await db
    .collection("trips")
    .find({ userId })
    .sort({ startDate: 1 })
    .toArray();

  const completed = trips.find((t) => t.status === "completed") || trips[0];
  const upcoming =
    trips.find((t) => t.status === "upcoming" || t.status === "ongoing") ||
    trips[trips.length - 1];

  if (!completed) {
    console.error("No trip found for Layla");
    process.exit(1);
  }

  const dest = completed.destinationId
    ? await db.collection("destinations").findOne({ _id: completed.destinationId })
    : null;
  const city = dest?.city || "the city";
  const country = dest?.country || "";
  const lat = dest?.latitude ?? null;
  const lng = dest?.longitude ?? null;

  const start = completed.startDate
    ? new Date(completed.startDate)
    : daysAgo(45);
  const nightCount = 5;

  const dayPlans = [
    {
      notes: "Landing day — settle in and stretch the legs",
      stops: [
        { title: "Airport transfer", startTime: "14:00", completed: true },
        { title: "Hotel check-in", startTime: "15:30", completed: true },
        { title: "Evening stroll downtown", startTime: "18:30", completed: true },
      ],
      memory: `First night in ${city}. Jet lag never stood a chance against that golden light.`,
      mood: "happy",
      rating: 5,
      places: [{ name: `${city} center`, note: "First coffee", lat, lng }],
      photos: [PPL[0]],
    },
    {
      notes: "Main sights and slow mornings",
      stops: [
        { title: "Breakfast at the café", startTime: "09:00", completed: true },
        { title: "Guided old-town walk", startTime: "10:30", completed: true },
        { title: "Museum afternoon", startTime: "14:00", completed: true },
      ],
      memory: "Wandered until my feet complained — every alley had a new story.",
      mood: "adventurous",
      rating: 5,
      places: [{ name: `${city} old town`, note: "Favorite corner", lat, lng }],
      photos: [PPL[1]],
    },
    {
      notes: "Nature day outside the city",
      stops: [
        { title: "Trail head pickup", startTime: "08:00", completed: true },
        { title: "Summit viewpoint", startTime: "11:30", completed: true },
        { title: "Picnic lunch", startTime: "13:00", completed: true },
      ],
      memory: "Cold air, loud silence, and a view I still replay.",
      mood: "amazed",
      rating: 5,
      places: [{ name: "Viewpoint trail", note: "Worth every step", lat, lng }],
      photos: [PPL[2], PPL[3]],
    },
    {
      notes: "Food crawl and markets",
      stops: [
        { title: "Morning market", startTime: "09:30", completed: true },
        { title: "Cooking class", startTime: "12:00", completed: true },
        { title: "Rooftop dinner", startTime: "19:30", completed: true },
      ],
      memory: "Ate like a local. Mint tea, spice stalls, and zero regrets.",
      mood: "grateful",
      rating: 4,
      places: [{ name: "Central market", note: "Buy spices next time", lat, lng }],
      photos: [PPL[4]],
    },
    {
      notes: "Soft day — spa and journals",
      stops: [
        { title: "Spa morning", startTime: "10:00", completed: true },
        { title: "Bookstore browse", startTime: "15:00", completed: true },
        { title: "Sunset lookout", startTime: "18:00", completed: true },
      ],
      memory: "Needed a quiet day. Wrote three pages and watched the sky change.",
      mood: "relaxed",
      rating: 5,
      places: [{ name: "Sunset lookout", note: "Come earlier next trip", lat, lng }],
      photos: [PPL[5]],
    },
    {
      notes: "Departure — one last coffee",
      stops: [
        { title: "Hotel checkout", startTime: "10:00", completed: true },
        { title: "Souvenir stop", startTime: "11:00", completed: true },
        { title: "Airport transfer", startTime: "13:30", completed: true },
      ],
      memory: `Last coffee in ${city}. Already plotting the return flight.`,
      mood: "grateful",
      rating: 5,
      places: [{ name: `${city} airport road`, note: null, lat, lng }],
      photos: [PPL[0], PPL[5]],
    },
  ];

  const days = dayPlans.slice(0, nightCount + 1).map((plan, i) => {
    const date = utcDay(start, i);
    return {
      _id: new ObjectId(),
      date,
      notes: plan.notes,
      stops: plan.stops.map((s, order) => ({
        _id: new ObjectId(),
        title: s.title,
        notes: null,
        startTime: s.startTime,
        reminderAt: null,
        reminderText: null,
        completed: s.completed,
        order,
      })),
      journal: {
        photos: plan.photos,
        memory: plan.memory,
        mood: plan.mood,
        rating: plan.rating,
        places: plan.places.map((p) => ({
          _id: new ObjectId(),
          name: p.name,
          note: p.note,
          lat: p.lat,
          lng: p.lng,
        })),
      },
    };
  });

  const endDate = days[days.length - 1].date;

  await db.collection("trips").updateOne(
    { _id: completed._id },
    {
      $set: {
        title: `${dest?.title || city} with Layla`,
        description: `A full week of ${city}${country ? `, ${country}` : ""} — mornings, markets, and trail days.`,
        coverImage: PPL[2],
        startDate: days[0].date,
        endDate,
        status: "completed",
        totalBudget: dest?.estimatedBudget || 1300,
        estimatedCost: completed.estimatedCost || 900,
        days,
        updatedAt: now,
      },
    }
  );

  // Journal collection powers gallery + dashboard memories
  await db.collection("trip_journals").deleteMany({ tripId: completed._id });
  await db.collection("trip_journals").insertMany(
    days.map((day, i) => ({
      tripId: completed._id,
      userId,
      dayKey: dayKey(day.date),
      photos: day.journal.photos,
      memory: day.journal.memory,
      mood: day.journal.mood,
      rating: day.journal.rating,
      places: day.journal.places,
      createdAt: day.date,
      updatedAt: now,
    }))
  );

  // Checklists for completed trip
  await db.collection("checklists").deleteMany({ tripId: completed._id });
  await db.collection("checklists").insertMany([
    {
      userId,
      tripId: completed._id,
      title: "Packing list",
      items: [
        { _id: new ObjectId(), text: "Passport + copies", completed: true },
        { _id: new ObjectId(), text: "Layers for cool mornings", completed: true },
        { _id: new ObjectId(), text: "Trail shoes", completed: true },
        { _id: new ObjectId(), text: "Camera / phone charger", completed: true },
        { _id: new ObjectId(), text: "Reusable water bottle", completed: true },
        { _id: new ObjectId(), text: "Travel journal", completed: true },
      ],
      createdAt: daysAgo(50),
      updatedAt: now,
    },
    {
      userId,
      tripId: completed._id,
      title: "Before departure",
      items: [
        { _id: new ObjectId(), text: "Confirm hotel transfer", completed: true },
        { _id: new ObjectId(), text: "Download offline maps", completed: true },
        { _id: new ObjectId(), text: "Notify bank of travel", completed: true },
        { _id: new ObjectId(), text: "Print boarding pass backup", completed: true },
      ],
      createdAt: daysAgo(48),
      updatedAt: now,
    },
  ]);

  // Expenses for completed trip
  await db.collection("expenses").deleteMany({ tripId: completed._id });
  await db.collection("expenses").insertMany([
    {
      userId,
      tripId: completed._id,
      title: "Round-trip flights",
      amount: 420,
      currency: "USD",
      category: "flight",
      date: daysAgo(50),
      notes: "Economy seats",
      createdAt: daysAgo(50),
      updatedAt: now,
    },
    {
      userId,
      tripId: completed._id,
      title: "Boutique hotel (5 nights)",
      amount: 380,
      currency: "USD",
      category: "hotel",
      date: daysAgo(44),
      notes: null,
      createdAt: daysAgo(44),
      updatedAt: now,
    },
    {
      userId,
      tripId: completed._id,
      title: "Trail day tour",
      amount: 95,
      currency: "USD",
      category: "activities",
      date: utcDay(start, 2),
      notes: "Includes lunch",
      createdAt: utcDay(start, 2),
      updatedAt: now,
    },
    {
      userId,
      tripId: completed._id,
      title: "Cooking class",
      amount: 65,
      currency: "USD",
      category: "activities",
      date: utcDay(start, 3),
      notes: null,
      createdAt: utcDay(start, 3),
      updatedAt: now,
    },
    {
      userId,
      tripId: completed._id,
      title: "Markets & meals",
      amount: 140,
      currency: "USD",
      category: "food",
      date: utcDay(start, 3),
      notes: "Spread across the week",
      createdAt: utcDay(start, 3),
      updatedAt: now,
    },
    {
      userId,
      tripId: completed._id,
      title: "Local transport",
      amount: 55,
      currency: "USD",
      category: "transport",
      date: utcDay(start, 4),
      notes: "Taxis + day pass",
      createdAt: utcDay(start, 4),
      updatedAt: now,
    },
    {
      userId,
      tripId: completed._id,
      title: "Souvenirs",
      amount: 48,
      currency: "USD",
      category: "shopping",
      date: utcDay(start, 5),
      notes: null,
      createdAt: utcDay(start, 5),
      updatedAt: now,
    },
  ]);

  // Upcoming / ongoing trip: richer journey + packing + expenses
  if (upcoming && String(upcoming._id) !== String(completed._id)) {
    const upDest = upcoming.destinationId
      ? await db.collection("destinations").findOne({ _id: upcoming.destinationId })
      : null;
    const upStart = upcoming.startDate
      ? new Date(upcoming.startDate)
      : daysAgo(-14);
    const upActs = await db
      .collection("activities")
      .find({ destinationId: upcoming.destinationId })
      .limit(4)
      .toArray();

    const upDays = [];
    const upNightCount = Math.max(
      3,
      Math.round(
        (new Date(upcoming.endDate) - upStart) / (1000 * 60 * 60 * 24)
      ) || 4
    );
    for (let i = 0; i <= Math.min(upNightCount, 5); i++) {
      const date = utcDay(upStart, i);
      const act = upActs[i % Math.max(upActs.length, 1)];
      upDays.push({
        _id: new ObjectId(),
        date,
        notes:
          i === 0
            ? "Arrive & settle"
            : i === upNightCount
              ? "Buffer / fly home"
              : `Explore day ${i + 1}`,
        stops:
          i === 0
            ? [
                {
                  _id: new ObjectId(),
                  title: "Hotel check-in",
                  notes: "Confirm late arrival",
                  startTime: "15:00",
                  reminderAt: null,
                  reminderText: null,
                  completed: false,
                  order: 0,
                },
                {
                  _id: new ObjectId(),
                  title: "Sunset walk",
                  notes: null,
                  startTime: "18:30",
                  reminderAt: null,
                  reminderText: null,
                  completed: false,
                  order: 1,
                },
              ]
            : [
                {
                  _id: new ObjectId(),
                  title: act?.title || `Day ${i + 1} highlight`,
                  notes: act?.description?.slice(0, 120) || null,
                  startTime: "10:00",
                  reminderAt: null,
                  reminderText: null,
                  completed: false,
                  order: 0,
                },
                {
                  _id: new ObjectId(),
                  title: "Free afternoon",
                  notes: "Cafés and photos",
                  startTime: "15:00",
                  reminderAt: null,
                  reminderText: null,
                  completed: false,
                  order: 1,
                },
              ],
        journal: {
          photos: [],
          memory: null,
          mood: null,
          rating: null,
          places: [],
        },
      });
    }

    await db.collection("trips").updateOne(
      { _id: upcoming._id },
      {
        $set: {
          title: `${upDest?.title || "Next escape"} · Layla`,
          description: `Planned journey through ${upDest?.city || "the destination"}.`,
          coverImage: upDest?.thumbnail || upcoming.coverImage,
          days: upDays,
          endDate: upDays[upDays.length - 1].date,
          updatedAt: now,
        },
      }
    );

    await db.collection("checklists").deleteMany({ tripId: upcoming._id });
    await db.collection("checklists").insertMany([
      {
        userId,
        tripId: upcoming._id,
        title: "Packing list",
        items: [
          { _id: new ObjectId(), text: "Passport", completed: true },
          { _id: new ObjectId(), text: "Charger + adapter", completed: true },
          { _id: new ObjectId(), text: "Travel insurance PDF", completed: false },
          { _id: new ObjectId(), text: "Comfortable walking shoes", completed: false },
          { _id: new ObjectId(), text: "Swim / weather layers", completed: false },
          { _id: new ObjectId(), text: "Meds / first aid", completed: false },
          { _id: new ObjectId(), text: "Sunglasses", completed: false },
        ],
        createdAt: daysAgo(10),
        updatedAt: now,
      },
      {
        userId,
        tripId: upcoming._id,
        title: "To book before leave",
        items: [
          { _id: new ObjectId(), text: "Airport transfer", completed: true },
          { _id: new ObjectId(), text: "One special dinner reservation", completed: false },
          { _id: new ObjectId(), text: "Day tour deposit", completed: false },
        ],
        createdAt: daysAgo(8),
        updatedAt: now,
      },
    ]);

    await db.collection("expenses").deleteMany({ tripId: upcoming._id });
    const pkgPrice = Number(upcoming.estimatedCost) || 520;
    await db.collection("expenses").insertMany([
      {
        userId,
        tripId: upcoming._id,
        title: "Flights (hold)",
        amount: Math.round(pkgPrice * 0.55),
        currency: "USD",
        category: "flight",
        date: daysAgo(9),
        notes: "Paid",
        createdAt: daysAgo(9),
        updatedAt: now,
      },
      {
        userId,
        tripId: upcoming._id,
        title: "Hotel deposit",
        amount: Math.round(pkgPrice * 0.3),
        currency: "USD",
        category: "hotel",
        date: daysAgo(8),
        notes: null,
        createdAt: daysAgo(8),
        updatedAt: now,
      },
      {
        userId,
        tripId: upcoming._id,
        title: "Travel insurance",
        amount: 42,
        currency: "USD",
        category: "other",
        date: daysAgo(7),
        notes: null,
        createdAt: daysAgo(7),
        updatedAt: now,
      },
      {
        userId,
        tripId: upcoming._id,
        title: "Local SIM (planned)",
        amount: 25,
        currency: "USD",
        category: "other",
        date: daysAgo(2),
        notes: "Buy on arrival",
        createdAt: daysAgo(2),
        updatedAt: now,
      },
    ]);
  }

  console.log("Layla enriched:");
  console.log(`  profile photo: ${PPL[0]}`);
  console.log(`  completed trip: ${completed._id} (${days.length} days, ${PPL.length} people photos)`);
  if (upcoming && String(upcoming._id) !== String(completed._id)) {
    console.log(`  upcoming trip: ${upcoming._id} (journey + checklists + expenses)`);
  }
  console.log("  login: layla@example.com / Traveler123!");
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await client.close();
}
