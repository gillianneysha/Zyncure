import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    console.log("Function called");
    console.log("BOOT: SUPABASE_SERVICE_ROLE_KEY length:", (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "MISSING").length);
    console.log("BOOT: SUPABASE_SERVICE_ROLE_KEY value:", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "MISSING");
    console.log("BOOT: SUPABASE_URL:", Deno.env.get("SUPABASE_URL") || "MISSING");

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const { email, password } = await req.json();
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL"),
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Authenticate user
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
            status: 401,
            headers: corsHeaders
        });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store OTP
    await supabase.from("user_otps").insert({
        user_id: data.user.id,
        email,
        otp_code: otp,
        expires_at: expiresAt,
        used: false
    });

    // Send OTP via Resend
    await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: "onboarding@resend.dev",
            to: email,
            subject: "Your OTP Code",
            html: `<p>Your OTP code is <b>${otp}</b>. It expires in 1 minute.</p>`
        })
    });

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: corsHeaders
    });
});