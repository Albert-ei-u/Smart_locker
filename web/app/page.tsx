import { getBackendUrl } from "@/lib/backend";
import { fetchUsersFromBackend } from "@/lib/users-scraper";
import { StatusResponse, User } from "@/lib/types";
import { Dashboard } from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const backendUrl = getBackendUrl();

  let initialStatus: StatusResponse | null = null;
  let initialUsers: User[] | null = null;
  let initialUsersError: string | null = null;

  try {
    // 1. Fetch live status from Flask
    const statusRes = await fetch(
      `${backendUrl.replace(/\/$/, "")}/api/status`,
      {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      }
    ).catch(() => null);

    if (statusRes && statusRes.ok) {
      initialStatus = await statusRes.json().catch(() => null);
    }

    // 2. Fetch users list via server-side scraper
    const usersResult = await fetchUsersFromBackend(backendUrl).catch(
      () => null
    );

    if (usersResult) {
      if (usersResult.users) {
        initialUsers = usersResult.users;
      }
      if (usersResult.error) {
        initialUsersError = usersResult.error;
      }
    }
  } catch (error) {
    // Do not return a 500 if backend is unreachable at render time.
    // Gracefully render the page in the offline state so SWR client can recover.
    console.error("Initial server-side fetch from Flask failed:", error);
  }

  return (
    <Dashboard
      initialStatus={initialStatus}
      initialUsers={initialUsers}
      initialUsersError={initialUsersError}
    />
  );
}
