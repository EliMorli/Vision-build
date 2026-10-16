import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store";
import { checkIsAdmin } from "@/lib/moderation";

/**
 * null while checking, then true/false. Convenience only: the database
 * refuses every admin RPC for non-admins (migration 00025).
 */
export function useIsAdmin(): boolean | null {
  const userId = useAuthStore((s) => s.session?.user?.id ?? s.profile?.id ?? null);
  const [result, setResult] = useState<{ userId: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    checkIsAdmin()
      .catch(() => false)
      .then((isAdmin) => {
        if (alive) setResult({ userId, isAdmin });
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  if (!userId) return false;
  return result?.userId === userId ? result.isAdmin : null;
}
