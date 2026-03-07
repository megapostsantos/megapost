import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cloud (source)
const CLOUD_URL = Deno.env.get("SUPABASE_URL")!;
const CLOUD_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// External (destination)
const EXT_URL = "https://tqajkhmvmwnltzfshugh.supabase.co";
const EXT_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cloud = createClient(CLOUD_URL, CLOUD_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const ext = createClient(EXT_URL, EXT_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: Record<string, { count: number; error?: string }> = {};

    // Order matters due to foreign keys
    const tables = [
      "site_settings",
      "drivers",
      "sellers",
      "dias",
      "rotas",
      "stock_pickups",
      "estoque",
      "ocorrencias",
      "conferencias",
      "finance_entries",
      "financeiro_entradas",
      "financeiro_saidas",
      "documentos",
      "route_event_log",
      "audit_log",
    ];

    for (const table of tables) {
      // Read all from Cloud (paginate for large tables)
      let allRows: any[] = [];
      let from = 0;
      const pageSize = 500;

      while (true) {
        const { data, error } = await cloud
          .from(table)
          .select("*")
          .range(from, from + pageSize - 1)
          .order("created_at", { ascending: true });

        if (error) {
          results[table] = { count: 0, error: error.message };
          break;
        }
        if (!data || data.length === 0) break;
        allRows = allRows.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      if (results[table]?.error) continue;

      if (allRows.length === 0) {
        results[table] = { count: 0 };
        continue;
      }

      // Insert into external in batches
      const batchSize = 100;
      let inserted = 0;
      let lastError = "";

      for (let i = 0; i < allRows.length; i += batchSize) {
        const batch = allRows.slice(i, i + batchSize);
        const { error } = await ext
          .from(table)
          .upsert(batch, { onConflict: "id", ignoreDuplicates: true });

        if (error) {
          lastError = error.message;
        } else {
          inserted += batch.length;
        }
      }

      results[table] = {
        count: inserted,
        ...(lastError ? { error: lastError } : {}),
      };
    }

    return new Response(JSON.stringify({ success: true, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
