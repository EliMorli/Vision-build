// Supabase Edge Function: unsubscribe
// Handles contractor opt-out requests (CAN-SPAM compliance)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getServiceRoleClient } from "../_shared/auth.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Unsubscribe</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
    h1 { color: #202124; }
    p { line-height: 1.6; color: #5f6368; }
  </style>
</head>
<body>
  <h1>Invalid Request</h1>
  <p>No email address provided. Please use the unsubscribe link from the email.</p>
</body>
</html>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    const supabase = getServiceRoleClient();

    // Insert or ignore (email is unique)
    await supabase.from("contractor_optouts").insert({
      email: email.toLowerCase(),
    });

    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Unsubscribed</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
    h1 { color: #34a853; }
    p { line-height: 1.6; color: #5f6368; }
  </style>
</head>
<body>
  <h1>You've Been Unsubscribed</h1>
  <p>
    <strong>${email}</strong> has been removed from our contractor lead mailing list.
  </p>
  <p>
    You will no longer receive project leads from VisionBuild.
  </p>
</body>
</html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Error</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
    h1 { color: #ea4335; }
    p { line-height: 1.6; color: #5f6368; }
  </style>
</head>
<body>
  <h1>Error</h1>
  <p>An error occurred while processing your unsubscribe request. Please contact support.</p>
  <p><small>${error.message}</small></p>
</body>
</html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
});
