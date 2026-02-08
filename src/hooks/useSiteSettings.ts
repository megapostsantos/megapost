import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettingsMap {
  [key: string]: string;
}

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettingsMap>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("key, value");

    if (data) {
      const obj: SiteSettingsMap = {};
      data.forEach((row: any) => {
        obj[row.key] = row.value || "";
      });
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
      setSettings((prev) => ({ ...prev, [key]: value }));
    }
    return { error };
  };

  return { settings, loading, updateSetting, refetch: fetchSettings };
};
