import Image from "next/image";
import Link from "next/link";
import {
  BeachIcon,
  ColumnsIcon,
  DiamondIcon,
  FamilyIcon,
  HeartsIcon,
  LeafIcon,
  LoungeChairIcon,
  MapPinIcon,
  MountainIcon,
  SoloIcon,
} from "./icons";
import { connectDB } from "@/lib/db/mongoose";
import { Mood } from "@/models";

type MoodDoc = {
  _id: string;
  name: string;
  slug: string;
  icon: string | null;
};

const DEFAULT_ICON_BY_SLUG: Record<string, typeof MountainIcon> = {
  adventure: MountainIcon,
  relaxation: LoungeChairIcon,
  romantic: HeartsIcon,
  nature: LeafIcon,
  cultural: ColumnsIcon,
  luxury: DiamondIcon,
  beach: BeachIcon,
  family: FamilyIcon,
  solo: SoloIcon,
};

const MOOD_ORDER = [
  "adventure",
  "relaxation",
  "romantic",
  "nature",
  "cultural",
  "luxury",
];

async function getMoods(): Promise<MoodDoc[]> {
  await connectDB();

  const moods = await Mood.find({ isActive: true }).select("name slug icon").lean();
  const parsed: MoodDoc[] = JSON.parse(JSON.stringify(moods));

  return parsed
    .sort((a, b) => {
      const ai = MOOD_ORDER.indexOf(a.slug);
      const bi = MOOD_ORDER.indexOf(b.slug);
      if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    })
    .slice(0, 6);
}

export async function ExploreByMood() {
  const moods = await getMoods();

  return (
    <section id="explore-by-mood" className="lp-section lp-section--muted">
      <div className="lp-wrap">
        <h2 className="lp-title">Explore by mood</h2>

        {moods.length === 0 ? (
          <p className="lp-empty">No moods published yet — check back soon.</p>
        ) : (
          <ul className="lp-moods">
            {moods.map((mood) => {
              const isImageIcon =
                mood.icon?.startsWith("http") || mood.icon?.startsWith("/");
              const FallbackIcon = DEFAULT_ICON_BY_SLUG[mood.slug] ?? MapPinIcon;

              return (
                <li key={mood._id}>
                  <Link
                    href={`/destinations?moods=${encodeURIComponent(mood._id)}`}
                    className="lp-mood"
                  >
                    {isImageIcon ? (
                      <span className="lp-mood__icon" style={{ position: "relative" }}>
                        <Image
                          src={mood.icon as string}
                          alt=""
                          fill
                          className="object-contain"
                        />
                      </span>
                    ) : (
                      <FallbackIcon className="lp-mood__icon" />
                    )}
                    {mood.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
