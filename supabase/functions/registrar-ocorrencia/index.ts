import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting by IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     req.headers.get("cf-connecting-ip") || "unknown";
    if (isRateLimited(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Tente novamente mais tarde." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { nome, placa, rota, nx, tipo, descricao } = body;

    if (!nome || !placa || !rota || !nx || !tipo || !descricao) {
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate types
    if (typeof nome !== "string" || typeof placa !== "string" || typeof rota !== "string" ||
        typeof nx !== "string" || typeof tipo !== "string" || typeof descricao !== "string") {
      return new Response(
        JSON.stringify({ error: "Dados inválidos: tipo incorreto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (nome.length > 200 || placa.length > 20 || rota.length > 50 || nx.length > 50 || tipo.length > 100 || descricao.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos: tamanho excedido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Try to find matching route for today
    const today = new Date().toISOString().split("T")[0];
    const { data: dia } = await supabase
      .from("dias")
      .select("id")
      .eq("data", today)
      .maybeSingle();

    let rotaId: string | null = null;
    if (dia) {
      const { data: rotaData } = await supabase
        .from("rotas")
        .select("id")
        .eq("dia_id", dia.id)
        .ilike("rota_codigo", `%${rota}%`)
        .maybeSingle();
      if (rotaData) {
        rotaId = rotaData.id;
      }
    }

    const insertData: Record<string, unknown> = {
      tipo,
      descricao,
      nome_motorista: nome,
      placa_veiculo: placa,
      rota_numero: rota,
      nx_codigo_oc: nx,
      origem: "externo",
      status: "aberta",
    };

    if (rotaId) {
      insertData.rota_id = rotaId;
    }

    const { error: insertError } = await supabase.from("ocorrencias").insert(insertData);

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar ocorrência" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
