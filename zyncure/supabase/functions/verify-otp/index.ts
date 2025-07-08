import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
};


serve(async (req) => {
    console.log("Verify OTP function called");


    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }


    try {
        const { email, otp_code } = await req.json();
        console.log("Received email:", email, "OTP:", otp_code);


        if (!email || !otp_code) {
            console.log("Missing email or OTP code");
            return new Response(
                JSON.stringify({ error: "Email and OTP code are required" }),
                { status: 400, headers: corsHeaders }
            );
        }


        // Normalize inputs
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedOtp = otp_code.toString().trim();


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


        // Get current time
        const currentTime = new Date().toISOString();
        console.log("Current time:", currentTime);


        // Find valid OTP with proper error handling
        console.log("Searching for OTP...");
        const { data: otpData, error: otpError } = await supabase
            .from("user_otps")
            .select("*")
            .eq("email", normalizedEmail)
            .eq("used", false)
            .gte("expires_at", currentTime);


        // Check for database errors FIRST
        if (otpError) {
            console.error("Database query error:", otpError);
            return new Response(
                JSON.stringify({
                    error: "Database error occurred",
                    details: otpError.message
                }),
                { status: 500, headers: corsHeaders }
            );
        }


        console.log("Valid OTPs found:", otpData);


        // Check if no OTPs found
        if (!otpData || otpData.length === 0) {
            console.log("No valid OTPs found for email:", normalizedEmail);


            const { data: expiredOtps, error: expiredError } = await supabase
                .from("user_otps")
                .select("*")
                .eq("email", normalizedEmail)
                .eq("used", false)
                .lt("expires_at", currentTime)
                .limit(1);


            if (expiredOtps && expiredOtps.length > 0) {
                return new Response(
                    JSON.stringify({ error: "OTP has expired. Please request a new one." }),
                    { status: 400, headers: corsHeaders }
                );
            }


            return new Response(
                JSON.stringify({ error: "No valid OTP found. Please request a new one." }),
                { status: 400, headers: corsHeaders }
            );
        }


        // Find matching OTP
        const matchingOtp = otpData.find(otp => {
            const storedOtp = otp.otp_code.toString().trim();
            console.log(`Comparing stored OTP: "${storedOtp}" with input: "${normalizedOtp}"`);
            return storedOtp === normalizedOtp;
        });


        if (!matchingOtp) {
            console.log("OTP code mismatch. Available OTPs:", otpData.map(o => o.otp_code));
            return new Response(
                JSON.stringify({
                    error: "Invalid OTP code. Please check and try again."
                }),
                { status: 400, headers: corsHeaders }
            );
        }


        console.log("Matching OTP found:", matchingOtp);


        const expiresAt = new Date(matchingOtp.expires_at);
        const now = new Date();


        if (expiresAt <= now) {
            console.log("OTP has expired:", {
                expires_at: matchingOtp.expires_at,
                current_time: currentTime,
                expired_by_ms: now.getTime() - expiresAt.getTime()
            });
            return new Response(
                JSON.stringify({ error: "OTP has expired. Please request a new one." }),
                { status: 400, headers: corsHeaders }
            );
        }


        console.log("Marking OTP as used...");
        const { error: updateError } = await supabase
            .from("user_otps")
            .update({
                used: true
            })
            .eq("id", matchingOtp.id);


        if (updateError) {
            console.error("Failed to mark OTP as used:", updateError);
            return new Response(
                JSON.stringify({
                    error: "Failed to process OTP",
                    details: updateError.message
                }),
                { status: 500, headers: corsHeaders }
            );
        }


        console.log("OTP verified successfully for user:", matchingOtp.user_id);


        // OTP is valid and has been marked as used
        return new Response(
            JSON.stringify({
                success: true,
                message: "OTP verified successfully",
                user_id: matchingOtp.user_id
            }),
            { status: 200, headers: corsHeaders }
        );


    } catch (error) {
        console.error("Verify OTP error:", error);
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                details: error.message
            }),
            { status: 500, headers: corsHeaders }
        );
    }
});
