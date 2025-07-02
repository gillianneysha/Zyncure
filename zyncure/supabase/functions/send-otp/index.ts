import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const { email, user_id } = await req.json();
    if (!email || !user_id) {
      return new Response(JSON.stringify({ error: "Missing email or user_id" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes from now

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Store OTP in the user_otps table
    const { error: insertError } = await supabase
      .from("user_otps")
      .insert([{ user_id, email, otp_code: otp, expires_at }]);

    if (insertError) {
      console.error("Failed to store OTP:", insertError);
      return new Response(JSON.stringify({ error: "Failed to store OTP" }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // --- Send OTP via Resend ---
    if (RESEND_API_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Use Resend's sandbox domain for testing
          from: "Zyncure <onboarding@resend.dev>",
          to: email,
          subject: "Your Zyncure OTP Code",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #55A1A4;">Zyncure - OTP Verification</h2>
              <p>Your OTP code is:</p>
              <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
                ${otp}
              </div>
              <p>This code will expire in 5 minutes.</p>
              <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        const errorText = await emailRes.text();
        console.error("Failed to send OTP email:", errorText);

        // Parse the error to get more details
        let errorMessage = "Failed to send OTP email";
        try {
          const errorObj = JSON.parse(errorText);
          errorMessage = errorObj.message || errorMessage;
        } catch (e) {
          // If parsing fails, use the raw error text
          errorMessage = errorText;
        }

        return new Response(JSON.stringify({
          error: "Failed to send OTP email",
          details: errorMessage
        }), {
          status: 500,
          headers: corsHeaders
        });
      }

      console.log(`OTP email sent successfully to ${email}`);
    } else {
      console.log(`No RESEND_API_KEY found. OTP for ${email}: ${otp}`);
      return new Response(JSON.stringify({
        error: "Email service not configured"
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error"
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});