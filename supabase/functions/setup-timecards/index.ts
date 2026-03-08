import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const extUrl = Deno.env.get("VITE_SUPABASE_URL");
    const extKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
    if (!extUrl || !extKey) throw new Error("Missing config");

    const supabase = createClient(extUrl, extKey, {
      db: { schema: "public" },
    });

    // Use raw SQL via rpc or direct query
    const sql = `
      CREATE TABLE IF NOT EXISTS public.timecards (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        date date NOT NULL DEFAULT CURRENT_DATE,
        clock_in timestamptz,
        clock_out timestamptz,
        worked_hours numeric DEFAULT 0,
        extra_hours numeric DEFAULT 0,
        daily_payment numeric DEFAULT 0,
        notes text,
        payment_status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now()
      );

      ALTER TABLE public.timecards ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timecards' AND policyname = 'Users read own timecards') THEN
          CREATE POLICY "Users read own timecards" ON public.timecards FOR SELECT USING (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timecards' AND policyname = 'Users insert own timecards') THEN
          CREATE POLICY "Users insert own timecards" ON public.timecards FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timecards' AND policyname = 'Users update own timecards') THEN
          CREATE POLICY "Users update own timecards" ON public.timecards FOR UPDATE USING (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timecards' AND policyname = 'Admins read all timecards') THEN
          CREATE POLICY "Admins read all timecards" ON public.timecards FOR SELECT USING (has_role(auth.uid(), 'admin'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timecards' AND policyname = 'Admins update all timecards') THEN
          CREATE POLICY "Admins update all timecards" ON public.timecards FOR UPDATE USING (has_role(auth.uid(), 'admin'));
        END IF;
      END $$;
    `;

    // Execute via the postgres connection
    const resp = await fetch(`${extUrl}/rest/v1/rpc/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: extKey,
        Authorization: `Bearer ${extKey}`,
      },
    });

    // Alternative: use the management API or just return SQL for manual execution
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Please run this SQL on the external database",
      sql 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
