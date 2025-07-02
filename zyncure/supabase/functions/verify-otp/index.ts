import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const { email, otp_code } = await req.json();
  if (!email || !otp_code) {
    return new Response(JSON.stringify({ error: "Missing email or otp_code" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  // Find the OTP
  const { data, error } = await supabase
    .from("user_otps")
    .select("*")
    .eq("email", email)
    .eq("otp_code", otp_code)
    .eq("used", false)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ success: false, message: "Invalid OTP" }), { status: 400 });
  }

  // Check expiry
  if (new Date(data.expires_at) < new Date()) {
    return new Response(JSON.stringify({ success: false, message: "OTP expired" }), { status: 400 });
  }

  // Mark as used
  await supabase
    .from("user_otps")
    .update({ used: true })
    .eq("id", data.id);

  // For every response, add the CORS headers:
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});