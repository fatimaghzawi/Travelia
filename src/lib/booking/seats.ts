import { Activity, Destination, TripPackage } from "@/models";
import type { ITripPackage } from "@/models/tripPackage.model";

/**
 * Keep package open/full in sync after $inc updates (pre-save hooks do not run).
 * Never reopens a closed package.
 */
export async function syncTripPackageAvailability(tripPackageId: string) {
  const pkg = await TripPackage.findById(tripPackageId);
  if (!pkg || pkg.status === "closed") return pkg;

  const nextStatus: ITripPackage["status"] =
    pkg.bookedCount >= pkg.capacity ? "full" : "open";

  if (pkg.status !== nextStatus) {
    pkg.status = nextStatus;
    await pkg.save();
  }
  return pkg;
}

/**
 * Atomically claim one package seat when capacity remains.
 * Returns false if sold out / closed / missing.
 */
export async function tryClaimPackageSeat(
  tripPackageId: string
): Promise<boolean> {
  const updated = await TripPackage.findOneAndUpdate(
    {
      _id: tripPackageId,
      status: "open",
      $expr: { $lt: ["$bookedCount", "$capacity"] },
    },
    { $inc: { bookedCount: 1 } },
    { new: true }
  );

  if (!updated) return false;
  await syncTripPackageAvailability(String(updated._id));
  return true;
}

export async function tryClaimActivitySeat(activityId: string): Promise<boolean> {
  const updated = await Activity.findOneAndUpdate(
    {
      _id: activityId,
      isAvailable: true,
      $expr: { $lt: ["$bookedCount", "$capacity"] },
    },
    { $inc: { bookedCount: 1 } },
    { new: true }
  );
  return Boolean(updated);
}

export async function releaseSeat(
  destinationId: string,
  activityId?: string | null,
  tripPackageId?: string | null
) {
  if (tripPackageId) {
    await TripPackage.findOneAndUpdate(
      { _id: tripPackageId, bookedCount: { $gt: 0 } },
      { $inc: { bookedCount: -1 } }
    );
    await syncTripPackageAvailability(String(tripPackageId));
    await Destination.findOneAndUpdate(
      { _id: destinationId, bookedCount: { $gt: 0 } },
      { $inc: { bookedCount: -1 } }
    );
  }
  if (activityId) {
    await Activity.findOneAndUpdate(
      { _id: activityId, bookedCount: { $gt: 0 } },
      { $inc: { bookedCount: -1 } }
    );
  }
}

/**
 * Capacity-checked claim used by admin reactivation and booking flows.
 * Throws if the seat cannot be claimed.
 */
export async function claimSeat(
  destinationId: string,
  activityId?: string | null,
  tripPackageId?: string | null
) {
  if (tripPackageId) {
    const ok = await tryClaimPackageSeat(String(tripPackageId));
    if (!ok) {
      throw new Error("PACKAGE_FULL");
    }
    await Destination.findByIdAndUpdate(destinationId, {
      $inc: { bookedCount: 1 },
    });
  }
  if (activityId) {
    const ok = await tryClaimActivitySeat(String(activityId));
    if (!ok) {
      throw new Error("ACTIVITY_FULL");
    }
  }
}
