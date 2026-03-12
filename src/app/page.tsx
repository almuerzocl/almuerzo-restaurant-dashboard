import { redirect } from "next/navigation";

export default function Home() {
  // If the user lands on the root, take them to the main dashboard.
  // The middleware will automatically kick them to /login if they're not authenticated.
  redirect("/dashboard/reservations");
}
