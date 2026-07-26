import { redirect } from "next/navigation";

/** Settings moved to navbar currency + theme toggles. */
export default function TravelerSettingsRedirect() {
  redirect("/dashboard");
}
