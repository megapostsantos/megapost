import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const MANAGE_USERS_URL = `https://otfjcpajobmjlwitgnqi.supabase.co/functions/v1/manage-users`;
const TTL_MS = 5 * 60 * 1000; // 5 minutos

// Cache de módulo (compartilhado entre todos os componentes)
let cache: Record<string, string> | null = null;
let cacheAt = 0;
let inflight: Promise<Record<string, string>> | null = null;

/**
 * Hook compartilhado para listar emails de usuários via Edge Function `manage-users`.
 * Antes: cada uso (AdminPonto + AdminFinanceiro x2) disparava sua própria chamada.
 * Agora: 1 chamada a cada 5 min, reaproveitada por todos.
 */
export const useUserEmails = (): Record<string, string> => {
  const { session } = useAuth();
  const [emails, setEmails] = useState<Record<string, string>>(cache || {});

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;

    const fresh = cache && Date.now() - cacheAt < TTL_MS;
    if (fresh) {
      setEmails(cache!);
      return;
    }

    if (!inflight) {
      inflight = (async () => {
        try {
          const res = await fetch(MANAGE_USERS_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action: "list" }),
          });
          const data = await res.json();
          const map: Record<string, string> = {};
          (data.users || []).forEach((u: any) => {
            if (u?.id && u?.email) map[u.id] = u.email;
          });
          cache = map;
          cacheAt = Date.now();
          return map;
        } catch {
          return cache || {};
        } finally {
          inflight = null;
        }
      })();
    }

    inflight.then(setEmails);
  }, [session?.access_token]);

  return emails;
};
