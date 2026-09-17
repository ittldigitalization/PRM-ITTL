import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Basic email validation — blocks SMTP header injection via \r\n in "to"
const isPlausibleEmail = (v: unknown): v is string =>
  typeof v === "string" &&
  v.length <= 320 &&
  !/[\r\n]/.test(v) &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify caller is a logged-in user
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized — no token" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) return json({ error: "Unauthorized — invalid token" }, 401);

    // 2. Parse request body
    const { to, subject, description } = await req.json();

    if (!isPlausibleEmail(to)) {
      return json({ error: "Invalid or missing recipient email address" }, 400);
    }

    // 3. Read SMTP config from secrets ONLY — never from the request body
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Number(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpFrom = Deno.env.get("SMTP_FROM") || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      return json(
        { error: "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS as Supabase Edge Function secrets." },
        500
      );
    }

    // 4. Send the email
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,   // true = implicit TLS; false = STARTTLS upgrade
      auth: { user: smtpUser, pass: smtpPass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    try {
      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject: subject || "Test Email from PMS",
        text: description || "This is a test email sent from the Project Management System.",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">📧 PMS Notification</h2>
            <p>${description || "This is a test email sent from the Project Management System."}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #6b7280;">
              Sent from Indo Tech PMS &bull; If you didn't expect this, you can safely ignore it.
            </p>
          </div>
        `,
      });

      return json({ success: true, messageId: info?.messageId });
    } finally {
      transporter.close();
    }
  } catch (err: any) {
    console.error("send-test-email error:", err);
    // Surface SMTP error codes but never the password
    return json({
      error: err?.message || "Unexpected error",
      code: err?.code,
      responseCode: err?.responseCode,
    }, 500);
  }
});
