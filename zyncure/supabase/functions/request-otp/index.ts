import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};


serve(async (req) => {
    console.log("Request OTP function called");


    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }


    try {
        const { email, password } = await req.json();


        if (!email || !password) {
            return new Response(
                JSON.stringify({ error: "Email and password are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }


        // Create supabase client with service role key (bypasses RLS)
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );


        // Create a separate client for user authentication (without service role)
        const userSupabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!
        );


        // Verify credentials by attempting to sign in
        const { data: signInData, error: signInError } = await userSupabase.auth.signInWithPassword({
            email,
            password
        });


        if (signInError) {
            console.log("Authentication failed:", signInError.message);
            return new Response(
                JSON.stringify({ error: "Invalid credentials" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }


        const userId = signInData.user?.id;
        if (!userId) {
            console.log("No user ID found after authentication");
            return new Response(
                JSON.stringify({ error: "Authentication failed" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }


        // Sign out the user from the temp session
        await userSupabase.auth.signOut();


        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 1 * 60 * 1000).toISOString();


        // Clean up any existing unused OTPs for this user
        await supabase
            .from("user_otps")
            .delete()
            .eq("user_id", userId)
            .eq("used", false);


        // Store OTP in database
        const { error: insertError } = await supabase
            .from("user_otps")
            .insert({
                user_id: userId,
                email,
                otp_code: otp,
                expires_at: expiresAt,
                used: false
            });


        if (insertError) {
            console.error("Failed to store OTP:", insertError);
            return new Response(
                JSON.stringify({ error: "Failed to generate OTP" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }


        // Send OTP via Resend
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) {
            console.error("RESEND_API_KEY not found");
            return new Response(
                JSON.stringify({ error: "Email service not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }


        const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "onboarding@resend.dev", // Make sure this domain is verified in Resend
                to: email,
                subject: "Your OTP Code",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #55A1A4;">Your OTP Code</h2>
                        <p>Your OTP code is:</p>
                        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
                            ${otp}
                        </div>
                        <p style="color: #666;">This code will expire in 1 minute.</p>
                        <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
                    </div>
                `
            })
        });


        const emailResult = await emailResponse.text();


        if (!emailResponse.ok) {
            console.error("Failed to send email:", emailResponse.status, emailResult);
            return new Response(
                JSON.stringify({ error: "Failed to send OTP email" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }


        console.log("OTP sent successfully to:", email);
        return new Response(
            JSON.stringify({ success: true, message: "OTP sent successfully" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );


    } catch (error) {
        console.error("Request OTP error:", error);
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                details: error.message
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
