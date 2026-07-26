import { redirect } from "next/navigation";

export default function ChecklistRedirectPage() {
  redirect("/dashboard/trips");
}
