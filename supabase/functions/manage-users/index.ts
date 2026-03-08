import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EXTERNAL_URL = "https://tqajkhmvmwnltzfshugh.supabase.co";
const EXTERNAL_SERVICE_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
const EXTERNAL_ANON_KEY = "sb_publishable_j47OP1q5aKd7ARzsj3Ea1Q_jXIANWMx";

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleRow } = await createClient(EXTERNAL_URL, EXTERNAL_SERVICE_KEY)
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (roleRow?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(EXTERNAL_URL, EXTERNAL_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { action, ...payload } = await req.json();

    // LIST USERS
    if (action === "list") {
      const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 500 });
      if (error) throw error;

      const { data: roles } = await adminClient.from("user_roles").select("*");
      const rolesMap = Object.fromEntries((roles || []).map((r: any) => [r.user_id, r.role]));

      const users = (data?.users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        role: rolesMap[u.id] || null,
        created_at: u.created_at,
        banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
        last_sign_in_at: u.last_sign_in_at,
      }));

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE USER
    if (action === "create") {
      const { email, password, role } = payload;
      const { data: newUser, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;

      // Upsert role
      if (role && newUser.user) {
        await adminClient
          .from("user_roles")
          .upsert({ user_id: newUser.user.id, role }, { onConflict: "user_id" });
      }

      return new Response(JSON.stringify({ user: newUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE ROLE
    if (action === "update_role") {
      const { user_id, role } = payload;
      // Prevent self-demotion
      if (user_id === caller.id && role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Você não pode remover seu próprio acesso admin." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { error } = await adminClient
        .from("user_roles")
        .upsert({ user_id, role }, { onConflict: "user_id" });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // BAN / UNBAN USER
    if (action === "toggle_ban") {
      const { user_id, ban } = payload;
      if (user_id === caller.id) {
        return new Response(
          JSON.stringify({ error: "Você não pode desativar sua própria conta." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const banUntil = ban ? "2999-12-31T23:59:59Z" : "epoch";
      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: ban ? "876000h" : "none",
      });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RESET PASSWORD
    if (action === "reset_password") {
      const { user_id, new_password } = payload;
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

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
