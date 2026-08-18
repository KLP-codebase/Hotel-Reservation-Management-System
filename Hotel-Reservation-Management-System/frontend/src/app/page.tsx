import { redirect } from "next/navigation";

/**
 * Root page — redirects unauthenticated users to login,
 * authenticated users to the dashboard.
 */
export default function HomePage() {
  redirect("/dashboard");
}
