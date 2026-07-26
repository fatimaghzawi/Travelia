"use client";

import { TaxonomyListPage } from "@/components/admin/TaxonomyListPage";

export default function CategoriesPage() {
  return (
    <TaxonomyListPage
      resource="categories"
      title="Categories"
      subtitle="Destination categories used for discovery and filtering"
      singular="Category"
    />
  );
}
