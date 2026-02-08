import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { nome, placa, rota, nx, tipo, descricao } = await req.json();

    if (!nome || !placa || !rota || !nx || !tipo || !descricao) {
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input lengths
    if (nome.length > 200 || placa.length > 20 || rota.length > 50 || nx.length > 50 || tipo.length > 100 || descricao.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos: tamanho excedido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase.from("ocorrencias").insert({
      tipo,
      descricao,
      nome_motorista: nome,
      placa_veiculo: placa,
      rota_numero: rota,
      nx_codigo_oc: nx,
      origem: "externo",
      status: "aberta",
      // rota_id is required but we don't have it for external submissions
      // We'll need to find the route or use a placeholder
    });

    // Try to find matching route and link
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

    // Insert occurrence with or without rota_id
    const insertData: any = {
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

    // Since rota_id is required in the schema, we need to handle this
    // If no matching route found, we'll still try to insert
    // The edge function bypasses RLS with service role key
    const { error: insertError } = await supabase.from("ocorrencias").insert(insertData);

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar ocorrência: " + insertError.message }),
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
