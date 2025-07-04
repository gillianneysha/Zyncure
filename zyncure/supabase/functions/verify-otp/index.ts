import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    console.log("Function called");
    console.log("SUPABASE_SERVICE_ROLE_KEY:", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    console.log("SUPABASE_URL:", Deno.env.get("SUPABASE_URL"));

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const { email, otp_code } = await req.json();
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL"),
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Find OTP
    const { data, error } = await supabase
        .from("user_otps")
        .select("*")
        .eq("email", email)
        .eq("otp_code", otp_code)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .single();

    if (error || !data)
        return new Response(
            JSON.stringify({ error: "Invalid or expired OTP" }),
            { status: 400, headers: corsHeaders }
        );

    // Mark OTP as used
    await supabase.from("user_otps").update({ used: true }).eq("id", data.id);

    // Sign in the user and return a session
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: data.password // You must store password or ask for it again (not recommended for security)
    });

    if (signInError || !sessionData.session) {
        return new Response(
            JSON.stringify({ error: "Failed to create session" }),
            { status: 500, headers: corsHeaders }
        );
    }

    return new Response(
        JSON.stringify({ success: true, session: sessionData.session }),
        { status: 200, headers: corsHeaders }
    );
});