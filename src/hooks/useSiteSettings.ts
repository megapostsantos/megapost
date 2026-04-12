import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/customSupabase";

export interface SiteSettingsMap {
  [key: string]: string;
}

// Module-level cache to avoid re-fetching across components
let cachedSettings: SiteSettingsMap | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettingsMap>(cachedSettings || {});
  const [loading, setLoading] = useState(!cachedSettings);

  const fetchSettings = useCallback(async () => {
    // Use cache if fresh
    if (cachedSettings && Date.now() - cacheTimestamp < CACHE_TTL) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("site_settings")
      .select("key, value");

    if (data) {
      const obj: SiteSettingsMap = {};
      data.forEach((row: any) => {
        obj[row.key] = row.value || "";
      });
      cachedSettings = obj;
      cacheTimestamp = Date.now();
      setSettings(obj);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        { key, value, updated_at: new Date().toISOString() } as any,
        { onConflict: "key" }
      );

    if (!error) {
      const updated = { ...settings, [key]: value };
      cachedSettings = updated;
      cacheTimestamp = Date.now();
      setSettings(updated);
    }
    return { error };
  };

  return { settings, loading, updateSetting, refetch: fetchSettings };
};
