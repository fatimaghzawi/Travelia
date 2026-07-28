import mongoose from "mongoose";
import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/handler";
import {
  Activity,
  Booking,
  Category,
  Destination,
  Favorite,
  Mood,
  Review,
  TripPackage,
} from "@/models";
import type {
  CreateDestinationInput,
  DestinationQueryInput,
  UpdateDestinationInput,
} from "@/validators/destination.validator";

export type DestinationCardData = {
  id: string;
  title: string;
  slug: string;
  description: string;
  country: string;
  city: string;
  thumbnail: string | null;
  estimatedBudget: number;
  recommendedDays: number;
  ratingAverage: number;
  reviewCount: number;
  capacity: number;
  bookedCount: number;
  remainingSlots: number;
  categoryId: string | null;
  categoryName: string | null;
  moodIds: string[];
  moodNames: string[];
  isFavorited: boolean;
  createdAt: string;
};

export type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

export type ActivityCardData = {
  id: string;
  title: string;
  description: string;
  duration: number;
  price: number;
  location: string | null;
  image: string | null;
  category: string;
  openingHours: string | null;
  capacity: number;
  bookedCount: number;
  remainingSlots: number;
  isAvailable: boolean;
};

export type DestinationMoodTag = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

export type TripPackageCardData = {
  id: string;
  title: string | null;
  departureDate: string;
  returnDate: string;
  capacity: number;
  bookedCount: number;
  remainingSlots: number;
  price: number;
  guideIncluded: boolean;
  status: "open" | "closed" | "full";
};

export type DestinationDetailData = DestinationCardData & {
  address: string | null;
  gallery: string[];
  bestSeason: string | null;
  requiresTravelDocuments: boolean;
  visaRequired: boolean;
  visaGuidance: string | null;
  categorySlug: string | null;
  categoryIcon: string | null;
  moods: DestinationMoodTag[];
  tripPackages: TripPackageCardData[];
  activities: ActivityCardData[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    userName: string;
  }[];
};

function fallbackImage(seed: string): string {
  const n = (seed.charCodeAt(0) % 15) + 2;
  return `/images/dest${n}.jpg`;
}

function populateRef(
  value: unknown
): { _id?: unknown; name?: string } | null {
  if (!value || typeof value !== "object") return null;
  return value as { _id?: unknown; name?: string };
}

function mapDestinationCard(
  d: {
    _id: unknown;
    title: string;
    slug: string;
    description: string;
    country: string;
    city: string;
    thumbnail?: string | null;
    estimatedBudget: number;
    recommendedDays: number;
    ratingAverage?: number;
    reviewCount?: number;
    capacity: number;
    bookedCount?: number;
    categoryId?: unknown;
    moodIds?: unknown[];
    createdAt?: Date | string;
  },
  favoriteIds: Set<string>
): DestinationCardData {
  const id = String(d._id);
  const category = populateRef(d.categoryId);
  const moodRefs = Array.isArray(d.moodIds) ? d.moodIds : [];
  const moods = moodRefs.map((m) => populateRef(m)).filter(Boolean);

  return {
    id,
    title: d.title,
    slug: d.slug,
    description: d.description,
    country: d.country,
    city: d.city,
    thumbnail: d.thumbnail || fallbackImage(id),
    estimatedBudget: d.estimatedBudget,
    recommendedDays: d.recommendedDays,
    ratingAverage: d.ratingAverage ?? 0,
    reviewCount: d.reviewCount ?? 0,
    capacity: d.capacity,
    bookedCount: d.bookedCount ?? 0,
    remainingSlots: Math.max(0, d.capacity - (d.bookedCount ?? 0)),
    categoryId: category?._id ? String(category._id) : null,
    categoryName: category?.name ?? null,
    moodIds: moods
      .map((m) => (m?._id ? String(m._id) : null))
      .filter(Boolean) as string[],
    moodNames: moods.map((m) => m?.name).filter(Boolean) as string[],
    isFavorited: favoriteIds.has(id),
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : "",
  };
}

export async function listActiveCategories(): Promise<TaxonomyItem[]> {
  return unstable_cache(
    async () => {
      await connectDB();
      const categories = await Category.find({ isActive: true })
        .sort("name")
        .select("name slug icon")
        .lean();
      return categories.map((c) => ({
        id: String(c._id),
        name: c.name,
        slug: c.slug,
        icon: c.icon ?? null,
      }));
    },
    ["taxonomy-categories"],
    { revalidate: 300, tags: ["taxonomy", "categories"] }
  )();
}

export async function listActiveMoods(): Promise<TaxonomyItem[]> {
  return unstable_cache(
    async () => {
      await connectDB();
      const moods = await Mood.find({ isActive: true })
        .sort("name")
        .select("name slug icon")
        .lean();
      return moods.map((m) => ({
        id: String(m._id),
        name: m.name,
        slug: m.slug,
        icon: m.icon ?? null,
      }));
    },
    ["taxonomy-moods"],
    { revalidate: 300, tags: ["taxonomy", "moods"] }
  )();
}

export type ListDestinationsParams = {
  userId?: string | null;
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  moodIds?: string[];
  sort?: "popular" | "newest" | "budget-asc" | "budget-desc" | "duration";
};

export type PaginatedDestinations = {
  items: DestinationCardData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

function destinationSort(
  sort: ListDestinationsParams["sort"]
): Record<string, 1 | -1> {
  switch (sort) {
    case "newest":
      return { createdAt: -1 };
    case "budget-asc":
      return { estimatedBudget: 1 };
    case "budget-desc":
      return { estimatedBudget: -1 };
    case "duration":
      return { recommendedDays: 1 };
    case "popular":
    default:
      return { ratingAverage: -1, reviewCount: -1, createdAt: -1 };
  }
}

export async function listPublishedDestinations(
  params: ListDestinationsParams | string | null = {}
): Promise<PaginatedDestinations> {
  // Back-compat: previous signature was listPublishedDestinations(userId?)
  const options: ListDestinationsParams =
    typeof params === "string" || params === null
      ? { userId: params }
      : params;

  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(48, Math.max(1, options.limit ?? 12));
  const sort = options.sort ?? "popular";

  await connectDB();

  const filter: Record<string, unknown> = { isPublished: true };
  if (options.categoryId && options.categoryId !== "all") {
    filter.categoryId = options.categoryId;
  }
  if (options.moodIds && options.moodIds.length > 0) {
    filter.moodIds = { $in: options.moodIds };
  }
  const search = options.search?.trim();
  if (search) {
    // Partial / prefix match (first letters). $text only matches whole words,
    // so typing "Par" would not find "Paris".
    const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: pattern, $options: "i" } },
      { country: { $regex: pattern, $options: "i" } },
      { city: { $regex: pattern, $options: "i" } },
    ];
  }

  const sortSpec = destinationSort(sort);

  const destinations = await Destination.find(filter)
    .populate("categoryId", "name")
    .populate("moodIds", "name")
    .sort(sortSpec)
    .skip((page - 1) * limit)
    .limit(limit)
    .select(
      "title slug description country city thumbnail estimatedBudget recommendedDays ratingAverage reviewCount capacity bookedCount categoryId moodIds createdAt"
    )
    .lean({ virtuals: true });

  const total = await Destination.countDocuments(filter);

  const pageIds = destinations.map((d) => d._id);
  const favorites =
    options.userId && pageIds.length > 0
      ? await Favorite.find({
          userId: options.userId,
          destinationId: { $in: pageIds },
        })
          .select("destinationId")
          .lean()
      : [];

  const favoriteIds = new Set(favorites.map((f) => String(f.destinationId)));

  return {
    items: destinations.map((d) => mapDestinationCard(d, favoriteIds)),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function listFavoriteDestinations(params: {
  userId: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedDestinations> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(48, Math.max(1, params.limit ?? 12));
  const search = params.search?.trim();

  await connectDB();

  const favorites = await Favorite.find({ userId: params.userId })
    .sort("-createdAt")
    .select("destinationId")
    .lean();

  const destinationIds = favorites.map((f) => f.destinationId);
  if (destinationIds.length === 0) {
    return {
      items: [],
      meta: { total: 0, page: 1, limit, totalPages: 1 },
    };
  }

  const destFilter: Record<string, unknown> = {
    _id: { $in: destinationIds },
    isPublished: true,
  };
  if (search) {
    destFilter.$or = [
      { title: { $regex: search, $options: "i" } },
      { country: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const matched = await Destination.find(destFilter)
    .populate("categoryId", "name")
    .populate("moodIds", "name")
    .lean({ virtuals: true });

  const byId = new Map(matched.map((d) => [String(d._id), d]));
  const ordered = destinationIds
    .map((id) => byId.get(String(id)))
    .filter(Boolean) as typeof matched;

  const total = ordered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const pageItems = ordered.slice(start, start + limit);
  const favoriteIds = new Set(destinationIds.map((id) => String(id)));

  return {
    items: pageItems.map((d) => mapDestinationCard(d, favoriteIds)),
    meta: {
      total,
      page: safePage,
      limit,
      totalPages,
    },
  };
}

export async function getDestinationDetail(
  id: string,
  userId?: string | null
): Promise<DestinationDetailData | null> {
  if (!mongoose.isValidObjectId(id)) return null;

  await connectDB();

  const destination = await Destination.findOne({
    _id: id,
    isPublished: true,
  })
    .populate("categoryId", "name slug icon")
    .populate("moodIds", "name slug icon")
    .lean({ virtuals: true });

  if (!destination) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [activities, favorite, packages, reviews] = await Promise.all([
    Activity.find({
      destinationId: destination._id,
      isAvailable: true,
    })
      .sort("price")
      .lean({ virtuals: true }),
    userId
      ? Favorite.findOne({ userId, destinationId: destination._id }).lean()
      : Promise.resolve(null),
    TripPackage.find({
      destinationId: destination._id,
      isPublished: true,
      status: { $in: ["open", "full"] },
      departureDate: { $gte: today },
    })
      .sort("departureDate")
      .lean({ virtuals: true }),
    Review.find({
      destinationId: destination._id,
      isApproved: true,
    })
      .populate("userId", "firstName lastName")
      .sort("-createdAt")
      .limit(12)
      .lean(),
  ]);

  const favoriteIds = new Set(favorite ? [String(destination._id)] : []);
  const base = mapDestinationCard(destination, favoriteIds);

  const category = destination.categoryId as
    | { _id?: unknown; name?: string; slug?: string; icon?: string | null }
    | null
    | undefined;
  const moodRefs = Array.isArray(destination.moodIds)
    ? destination.moodIds
    : [];
  const moods: DestinationMoodTag[] = moodRefs
    .map((m) => {
      if (!m || typeof m !== "object") return null;
      const mood = m as {
        _id?: unknown;
        name?: string;
        slug?: string;
        icon?: string | null;
      };
      if (!mood._id || !mood.name) return null;
      return {
        id: String(mood._id),
        name: mood.name,
        slug: mood.slug ?? "",
        icon: mood.icon ?? null,
      };
    })
    .filter(Boolean) as DestinationMoodTag[];

  return {
    ...base,
    address: destination.address ?? null,
    gallery: destination.gallery?.length
      ? destination.gallery
      : ([destination.thumbnail || fallbackImage(base.id)].filter(
          Boolean
        ) as string[]),
    bestSeason: destination.bestSeason ?? null,
    requiresTravelDocuments: destination.requiresTravelDocuments,
    visaRequired: destination.visaRequired,
    visaGuidance: destination.visaGuidance ?? null,
    categorySlug: category?.slug ?? null,
    categoryIcon: category?.icon ?? null,
    moods,
    tripPackages: packages.map((p) => {
      const packageId = String(p._id);
      const booked = p.bookedCount ?? 0;
      return {
        id: packageId,
        title: p.title ?? null,
        departureDate: new Date(p.departureDate).toISOString(),
        returnDate: new Date(p.returnDate).toISOString(),
        capacity: p.capacity,
        bookedCount: booked,
        remainingSlots: Math.max(0, p.capacity - booked),
        price: p.price,
        guideIncluded: Boolean(p.guideIncluded),
        status: p.status as "open" | "closed" | "full",
      };
    }),
    activities: activities.map((a) => {
      const activityId = String(a._id);
      return {
        id: activityId,
        title: a.title,
        description: a.description,
        duration: a.duration,
        price: a.price,
        location: a.location ?? null,
        image: a.image || fallbackImage(activityId),
        category: a.category,
        openingHours: a.openingHours ?? null,
        capacity: a.capacity,
        bookedCount: a.bookedCount ?? 0,
        remainingSlots: Math.max(0, a.capacity - (a.bookedCount ?? 0)),
        isAvailable: a.isAvailable,
      };
    }),
    reviews: reviews.map((r) => {
      const user = r.userId as unknown as {
        firstName?: string;
        lastName?: string;
      } | null;
      const name = [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      return {
        id: String(r._id),
        rating: r.rating,
        comment: r.comment ?? null,
        createdAt: new Date(r.createdAt).toISOString(),
        userName: name || "Traveler",
      };
    }),
  };
}

export async function listDestinationsForApi(
  query: DestinationQueryInput,
  { isAdmin }: { isAdmin: boolean }
) {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (query.country) filter.country = query.country;
  if (query.city) filter.city = query.city;
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.moodId) filter.moodIds = query.moodId;
  if (isAdmin && typeof query.isPublished === "boolean") {
    filter.isPublished = query.isPublished;
  } else {
    filter.isPublished = true;
  }
  if (query.minRating) filter.ratingAverage = { $gte: query.minRating };
  if (query.minBudget || query.maxBudget) {
    filter.estimatedBudget = {
      ...(query.minBudget ? { $gte: query.minBudget } : {}),
      ...(query.maxBudget ? { $lte: query.maxBudget } : {}),
    };
  }
  if (query.minDays || query.maxDays) {
    filter.recommendedDays = {
      ...(query.minDays ? { $gte: query.minDays } : {}),
      ...(query.maxDays ? { $lte: query.maxDays } : {}),
    };
  }
  if (query.search) {
    filter.$text = { $search: query.search };
  }

  const findQuery = Destination.find(filter)
    .populate("categoryId", "name slug icon")
    .populate("moodIds", "name slug icon")
    .sort("-createdAt")
    .skip((query.page - 1) * query.limit)
    .limit(query.limit);

  if (isAdmin) {
    findQuery.populate("createdBy", "firstName lastName email");
  }

  const [items, total] = await Promise.all([
    findQuery,
    Destination.countDocuments(filter),
  ]);

  return { items, total };
}

export async function createDestination(input: CreateDestinationInput) {
  await connectDB();

  const slugTaken = await Destination.findOne({ slug: input.slug });
  if (slugTaken) {
    throw new AppError(
      "A destination with this slug already exists",
      409,
      "SLUG_TAKEN"
    );
  }

  return Destination.create(input);
}

export async function getDestinationByIdForApi(
  id: string,
  { isAdmin }: { isAdmin: boolean }
) {
  await connectDB();

  const findQuery = Destination.findById(id)
    .populate("categoryId", "name slug icon")
    .populate("moodIds", "name slug icon");

  if (isAdmin) {
    findQuery.populate("createdBy", "firstName lastName email");
  }

  const destination = await findQuery;
  if (!destination) throw new AppError("Destination not found", 404, "NOT_FOUND");
  if (!isAdmin && !destination.isPublished) {
    throw new AppError("Destination not found", 404, "NOT_FOUND");
  }
  return destination;
}

export async function updateDestination(
  id: string,
  input: UpdateDestinationInput
) {
  await connectDB();

  if (input.slug) {
    const slugTaken = await Destination.findOne({
      slug: input.slug,
      _id: { $ne: id },
    });
    if (slugTaken) {
      throw new AppError(
        "A destination with this slug already exists",
        409,
        "SLUG_TAKEN"
      );
    }
  }

  const destination = await Destination.findByIdAndUpdate(id, input, {
    returnDocument: "after",
    runValidators: true,
  })
    .populate("categoryId", "name slug icon")
    .populate("moodIds", "name slug icon");
  if (!destination) throw new AppError("Destination not found", 404, "NOT_FOUND");
  return destination;
}

export async function deleteDestination(id: string) {
  await connectDB();

  const activeBookings = await Booking.countDocuments({
    destinationId: id,
    status: { $in: ["pending", "confirmed"] },
  });
  if (activeBookings > 0) {
    throw new AppError(
      `Cannot delete — ${activeBookings} active booking(s) reference this destination`,
      409,
      "IN_USE"
    );
  }

  await Activity.deleteMany({ destinationId: id });
  await TripPackage.deleteMany({ destinationId: id });
  const destination = await Destination.findByIdAndDelete(id);
  if (!destination) throw new AppError("Destination not found", 404, "NOT_FOUND");
  return destination;
}
