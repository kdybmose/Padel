import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Manglende Authorization header");

    const url = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const adminClient = createClient(url, serviceRoleKey);

    const {
      data: { user },
      error: userError
    } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Ugyldig session");

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    if (profile.role !== "admin") throw new Error("Kun admin kan sende invitationer");

    const { email, role, redirectTo } = await req.json();
    if (!email || !["admin", "user"].includes(role)) {
      throw new Error("Ugyldig payload");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRedirectTo = typeof redirectTo === "string" && redirectTo.trim() ? redirectTo.trim() : undefined;

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: { role },
      redirectTo: normalizedRedirectTo
    });
    if (inviteError) throw inviteError;

    const { error: upsertError } = await adminClient.from("invitations").upsert(
      {
        email: normalizedEmail,
        role,
        invited_by: user.id,
        invited_at: new Date().toISOString()
      },
      { onConflict: "email" }
    );
    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
