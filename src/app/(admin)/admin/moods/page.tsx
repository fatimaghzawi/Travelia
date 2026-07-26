"use client";

import { TaxonomyListPage } from "@/components/admin/TaxonomyListPage";

export default function MoodsPage() {
  return (
    <TaxonomyListPage
      resource="moods"
      title="Moods"
      subtitle="Explore-by-mood tags travelers use to find their trip"
      singular="Mood"
    />
  );
}
