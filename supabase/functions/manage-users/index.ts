import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EXTERNAL_URL = "https://tqajkhmvmwnltzfshugh.supabase.co";
const EXTERNAL_SERVICE_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
const EXTERNAL_ANON_KEY = "sb_publishable_j47OP1q5aKd7ARzsj3Ea1Q_jXIANWMx";

// Helper to log audit events
async function logAudit(
  adminClient: any,
  actorId: string,
  action: string,
  module: string,
  targetId: string | null,
  metadata: Record<string, unknown> | null
) {
  try {
    await adminClient.from("audit_log").insert({
      user_id: actorId,
      acao: action,
      tabela: module,
      registro_id: targetId || actorId,
      dados_novos: metadata,
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is admin via their JWT against external Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(EXTERNAL_URL, EXTERNAL_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Sessão expirada. Faça login novamente." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(EXTERNAL_URL, EXTERNAL_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (roleRow?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas administradores podem gerenciar usuários." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...payload } = await req.json();

    // LIST USERS
    if (action === "list") {
      const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 500 });
      if (error) throw error;

      const { data: roles } = await adminClient.from("user_roles").select("*");
      const rolesMap = Object.fromEntries((roles || []).map((r: any) => [r.user_id, r.role]));

      const { data: profiles } = await adminClient.from("profiles").select("*");
      const profilesMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));

      const users = (data?.users || []).map((u: any) => {
        const profile = profilesMap[u.id] || {};
        return {
          id: u.id,
          email: u.email,
          role: rolesMap[u.id] || null,
          created_at: u.created_at,
          banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
          last_sign_in_at: u.last_sign_in_at,
          nome: profile.nome || null,
          telefone: profile.telefone || null,
          endereco: profile.endereco || null,
          documento_foto_url: profile.documento_foto_url || null,
          display_name: profile.display_name || null,
        };
      });

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE USER
    if (action === "create") {
      const { email, password, role } = payload;
      
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "E-mail e senha são obrigatórios." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newUser, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;

      if (newUser.user) {
        // Ensure profile exists
        await adminClient
          .from("profiles")
          .upsert({ user_id: newUser.user.id, display_name: email }, { onConflict: "user_id" });

        // Upsert role
        if (role) {
          await adminClient
            .from("user_roles")
            .upsert({ user_id: newUser.user.id, role }, { onConflict: "user_id" });
        }
        
        // Audit log
        await logAudit(adminClient, caller.id, "user_created", "users", newUser.user.id, {
          email,
          role: role || "operador",
        });
      }

      return new Response(JSON.stringify({ user: newUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE ROLE
    if (action === "update_role") {
      const { user_id, role } = payload;
      
      if (!user_id || !role) {
        return new Response(JSON.stringify({ error: "ID do usuário e role são obrigatórios." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Prevent self-demotion
      if (user_id === caller.id && role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Você não pode remover seu próprio acesso admin." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Get previous role for audit
      const { data: prevRole } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user_id)
        .maybeSingle();
      
      const { error } = await adminClient
        .from("user_roles")
        .upsert({ user_id, role }, { onConflict: "user_id" });
      if (error) throw error;
      
      // Audit log
      await logAudit(adminClient, caller.id, "role_changed", "user_roles", user_id, {
        previous_role: prevRole?.role || null,
        new_role: role,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // BAN / UNBAN USER
    if (action === "toggle_ban") {
      const { user_id, ban } = payload;
      
      if (!user_id) {
        return new Response(JSON.stringify({ error: "ID do usuário é obrigatório." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (user_id === caller.id) {
        return new Response(
          JSON.stringify({ error: "Você não pode desativar sua própria conta." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: ban ? "876000h" : "none",
      });
      if (error) throw error;
      
      // Audit log
      await logAudit(adminClient, caller.id, ban ? "user_deactivated" : "user_activated", "users", user_id, null);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RESET PASSWORD
    if (action === "reset_password") {
      const { user_id, new_password } = payload;
      
      if (!user_id) {
        return new Response(JSON.stringify({ error: "ID do usuário é obrigatório." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (!new_password || new_password.length < 6) {
        return new Response(
          JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        password: new_password,
      });
      if (error) throw error;
      
      // Audit log
      await logAudit(adminClient, caller.id, "password_reset", "users", user_id, null);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação desconhecida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("manage-users error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
