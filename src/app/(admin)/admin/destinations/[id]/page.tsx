"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Plus, Pencil, Trash2, Star, Users, Wallet, CalendarDays } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { PrimaryButton, IconButton, SecondaryButton } from "@/components/admin/Buttons";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/admin/Badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { useToast } from "@/components/admin/Toast";
import { api, ApiClientError } from "@/lib/api/client";
import {
  DestinationForm,
  type DestinationRecord,
  type CategoryOption,
  type MoodOption,
} from "../DestinationForm";
import { ActivityForm, type ActivityRecord } from "../ActivityForm";

type DestinationDetail = Omit<DestinationRecord, "categoryId" | "moodIds"> & {
  _id: string;
  bookedCount: number;
  ratingAverage: number;
  reviewCount: number;
  categoryId: { _id: string; name: string } | string;
  moodIds: ({ _id: string; name: string } | string)[];
};

type ActivityRow = ActivityRecord & { _id: string; bookedCount: number };

export default function DestinationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [destination, setDestination] = useState<DestinationDetail | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [moods, setMoods] = useState<MoodOption[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityRow | null>(null);
  const [deleteActivity, setDeleteActivity] = useState<ActivityRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: dest }, { data: acts }] = await Promise.all([
        api.get<DestinationDetail>(`/destinations/${id}`),
        api.get<ActivityRow[]>("/activities", { destinationId: id, limit: 50 }),
      ]);
      setDestination(dest);
      setActivities(acts);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load destination", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    api.get<CategoryOption[]>("/categories", { limit: 100 }).then(({ data }) => setCategories(data));
    api.get<MoodOption[]>("/moods", { limit: 100 }).then(({ data }) => setMoods(data));
  }, [load]);

  async function handleDeleteActivity() {
    if (!deleteActivity) return;
    setDeleting(true);
    try {
      await api.delete(`/activities/${deleteActivity._id}`);
      showToast("Activity deleted");
      setDeleteActivity(null);
      load();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to delete activity", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (!destination) {
    return (
      <div>
        <Topbar title="Destination" />
        <div className="p-8 text-sm text-ink-soft">Loading…</div>
      </div>
    );
  }

  const categoryName =
    destination.categoryId && typeof destination.categoryId === "object"
      ? destination.categoryId.name
      : "";
  const moodNames = destination.moodIds
    .map((m) => (m && typeof m === "object" ? m.name : ""))
    .filter(Boolean);

  return (
    <div>
      <Topbar
        title={destination.title}
        subtitle={`${destination.city}, ${destination.country}`}
        actions={
          <div className="flex gap-3">
            <SecondaryButton onClick={() => router.push("/admin/destinations")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </SecondaryButton>
            <PrimaryButton onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit destination
            </PrimaryButton>
          </div>
        }
      />

      <div className="space-y-6 p-8">
        <div className="admin-panel overflow-hidden">
          <div className="relative h-64 w-full bg-navy-900">
            {destination.thumbnail ? (
              <Image src={destination.thumbnail} alt={destination.title} fill className="object-cover opacity-90" unoptimized />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 text-white">
              <h2 className="text-3xl font-semibold">{destination.title}</h2>
              <p className="mt-1 max-w-xl text-sm text-white/80">{destination.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {categoryName ? <Badge tone="info">{categoryName}</Badge> : null}
                {moodNames.map((m) => (
                  <Badge key={m} tone="success">
                    {m}
                  </Badge>
                ))}
                <Badge tone={destination.isPublished ? "success" : "neutral"}>
                  {destination.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-border border-t border-border sm:grid-cols-4">
            <Stat icon={Wallet} label="Est. budget" value={`$${destination.estimatedBudget}`} />
            <Stat icon={CalendarDays} label="Recommended days" value={destination.recommendedDays} />
            <Stat icon={Users} label="Seats" value={`${destination.bookedCount}/${destination.capacity}`} />
            <Stat
              icon={Star}
              label="Rating"
              value={destination.ratingAverage ? `${destination.ratingAverage.toFixed(1)} (${destination.reviewCount})` : "No reviews yet"}
            />
          </div>

          {destination.visaRequired ? (
            <div className="border-t border-border bg-amber-500/5 px-6 py-4 text-sm text-ink-muted">
              <span className="font-medium text-ink">Visa guidance: </span>
              {destination.visaGuidance || "Visa may be required — guidance not yet added."}
            </div>
          ) : null}
        </div>

        <div className="admin-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h3 className="text-base font-semibold text-ink">Things to do</h3>
              <p className="text-sm text-ink-muted">Activities travelers can add to this destination</p>
            </div>
            <PrimaryButton
              onClick={() => {
                setEditingActivity(null);
                setActivityModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add activity
            </PrimaryButton>
          </div>

          {activities.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Plus}
                title="No activities yet"
                description="Add things to do so travelers can build an itinerary here."
              />
            </div>
          ) : (
            <div className="admin-scroll overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-6 py-3 font-medium">Activity</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Duration</th>
                    <th className="px-6 py-3 font-medium">Price</th>
                    <th className="px-6 py-3 font-medium">Seats</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activities.map((activity) => (
                    <tr key={activity._id}>
                      <td className="px-6 py-3.5 font-medium text-ink">{activity.title}</td>
                      <td className="px-6 py-3.5 capitalize text-ink-muted">{activity.category}</td>
                      <td className="px-6 py-3.5 text-ink-muted">{activity.duration} min</td>
                      <td className="px-6 py-3.5 text-ink-muted">{activity.price === 0 ? "Free" : `$${activity.price}`}</td>
                      <td className="px-6 py-3.5 text-ink-muted">{activity.bookedCount}/{activity.capacity}</td>
                      <td className="px-6 py-3.5">
                        <Badge tone={activity.isAvailable ? "success" : "neutral"}>
                          {activity.isAvailable ? "Available" : "Hidden"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex justify-end gap-2">
                          <IconButton
                            title="Edit"
                            onClick={() => {
                              setEditingActivity(activity);
                              setActivityModalOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          <IconButton title="Delete" onClick={() => setDeleteActivity(activity)}>
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit destination" width="xl">
        <DestinationForm
          initial={destination}
          categories={categories}
          moods={moods}
          onCancel={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            load();
          }}
        />
      </Modal>

      <Modal
        open={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title={editingActivity ? "Edit activity" : "Add activity"}
        width="lg"
      >
        <ActivityForm
          destinationId={destination._id}
          initial={editingActivity ?? undefined}
          onCancel={() => setActivityModalOpen(false)}
          onSuccess={() => {
            setActivityModalOpen(false);
            load();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteActivity)}
        title="Delete activity"
        description={`Remove "${deleteActivity?.title}" from this destination?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDeleteActivity}
        onClose={() => setDeleteActivity(null)}
      />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs text-ink-soft">{label}</p>
        <p className="text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}
