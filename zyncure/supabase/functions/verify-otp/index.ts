import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
    console.log("verify-otp function called");
    console.log("Method:", req.method);
    console.log("Headers:", Object.fromEntries(req.headers.entries()));

    try {
        // Handle preflight OPTIONS request
        if (req.method === "OPTIONS") {
            return new Response("ok", { headers: corsHeaders });
        }

        if (req.method !== "POST") {
            return new Response(
                JSON.stringify({ error: "Method not allowed" }),
                { status: 405, headers: corsHeaders }
            );
        }

        // Parse request body with error handling
        let requestBody;
        try {
            requestBody = await req.json();
            console.log("Request body:", requestBody);
        } catch (e) {
            console.error("Failed to parse JSON:", e);
            return new Response(
                JSON.stringify({ error: "Invalid JSON in request body" }),
                { status: 400, headers: corsHeaders }
            );
        }

        const { email, otp_code, password } = requestBody;

        // Validate required fields
        if (!email || !otp_code) {
            return new Response(
                JSON.stringify({ error: "Email and OTP code are required" }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(
                JSON.stringify({ error: "Invalid email format" }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Validate OTP format (assuming 6-digit numeric)
        if (!/^\d{6}$/.test(otp_code)) {
            return new Response(
                JSON.stringify({ error: "OTP must be 6 digits" }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Missing environment variables");
            return new Response(
                JSON.stringify({ error: "Server configuration error" }),
                { status: 500, headers: corsHeaders }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log("Looking for OTP:", { email, otp_code });

        // Find and validate OTP
        const { data: otpData, error: otpError } = await supabase
            .from("user_otps")
            .select("*")
            .eq("email", email)
            .eq("otp_code", otp_code)
            .eq("used", false)
            .gte("expires_at", new Date().toISOString())
            .single();

        console.log("OTP query result:", { otpData, otpError });

        if (otpError) {
            console.error("OTP query error:", otpError);
            if (otpError.code === 'PGRST116') {
                // No rows returned
                return new Response(
                    JSON.stringify({ error: "Invalid or expired OTP" }),
                    { status: 400, headers: corsHeaders }
                );
            }
            return new Response(
                JSON.stringify({ error: "Database error while validating OTP" }),
                { status: 500, headers: corsHeaders }
            );
        }

        if (!otpData) {
            return new Response(
                JSON.stringify({ error: "Invalid or expired OTP" }),
                { status: 400, headers: corsHeaders }
            );
        }

        console.log("Valid OTP found, marking as used");

        // Mark OTP as used
        const { error: updateError } = await supabase
            .from("user_otps")
            .update({ used: true })
            .eq("id", otpData.id);

        if (updateError) {
            console.error("Error marking OTP as used:", updateError);
            // Continue anyway, as the OTP was valid
        }

        // Option 1: If you stored the password with the OTP (NOT RECOMMENDED for security)
        if (otpData.password) {
            console.log("Attempting to sign in with stored password");
            try {
                const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password: otpData.password
                });

                if (signInError) {
                    console.error("Sign in error:", signInError);
                    return new Response(
                        JSON.stringify({ error: "Failed to create session: " + signInError.message }),
                        { status: 400, headers: corsHeaders }
                    );
                }

                if (!sessionData.session) {
                    return new Response(
                        JSON.stringify({ error: "Failed to create session" }),
                        { status: 500, headers: corsHeaders }
                    );
                }

                return new Response(
                    JSON.stringify({
                        success: true,
                        session: sessionData.session,
                        user: sessionData.user
                    }),
                    { status: 200, headers: corsHeaders }
                );
            } catch (authError) {
                console.error("Authentication error:", authError);
                return new Response(
                    JSON.stringify({ error: "Authentication failed" }),
                    { status: 500, headers: corsHeaders }
                );
            }
        }

        // Option 2: If password is provided in the request (RECOMMENDED)
        if (password) {
            console.log("Attempting to sign in with provided password");
            try {
                const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (signInError) {
                    console.error("Sign in error:", signInError);
                    return new Response(
                        JSON.stringify({ error: "Invalid credentials: " + signInError.message }),
                        { status: 400, headers: corsHeaders }
                    );
                }

                if (!sessionData.session) {
                    return new Response(
                        JSON.stringify({ error: "Failed to create session" }),
                        { status: 500, headers: corsHeaders }
                    );
                }

                return new Response(
                    JSON.stringify({
                        success: true,
                        session: sessionData.session,
                        user: sessionData.user
                    }),
                    { status: 200, headers: corsHeaders }
                );
            } catch (authError) {
                console.error("Authentication error:", authError);
                return new Response(
                    JSON.stringify({ error: "Authentication failed" }),
                    { status: 500, headers: corsHeaders }
                );
            }
        }

        // Option 3: Just return success without creating a session (let client handle sign-in)
        console.log("OTP verified successfully, no password provided");
        return new Response(
            JSON.stringify({
                success: true,
                message: "OTP verified successfully"
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error("Unexpected error in verify-otp function:", error);
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                details: error.message
            }),
            { status: 500, headers: corsHeaders }
        );
    }
});