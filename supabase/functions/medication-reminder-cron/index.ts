import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as jose from "https://deno.land/x/jose@v5.9.6/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Medication reminder cron started");

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Configure VAPID keys for push notifications
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all due reminders that haven't been sent yet
    const now = new Date().toISOString();
    const { data: dueReminders, error: fetchError } = await supabase
      .from("medication_reminders")
      .select("*")
      .eq("sent", false)
      .lte("remind_at", now);

    if (fetchError) {
      console.error("Error fetching due reminders:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${dueReminders?.length || 0} due reminders`);

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No due reminders", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const reminder of dueReminders) {
      try {
        console.log(`Processing reminder for ${reminder.medication_name} (user: ${reminder.user_id})`);

        // Get the user's push subscription
        const { data: subscriptions, error: subError } = await supabase
          .from("push_subscriptions")
          .select("subscription")
          .eq("user_id", reminder.user_id);

        if (subError) {
          console.error(`Error fetching subscription for user ${reminder.user_id}:`, subError);
          errors.push(`User ${reminder.user_id}: ${subError.message}`);
          continue;
        }

        // Mark as sent regardless of whether we have subscriptions
        await supabase
          .from("medication_reminders")
          .update({ sent: true })
          .eq("id", reminder.id);

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`No push subscription found for user ${reminder.user_id}`);
          continue;
        }

        // Send push notification to all subscriptions for this user
        for (const { subscription } of subscriptions) {
          try {
            const endpoint = subscription.endpoint;
            const url = new URL(endpoint);
            const audience = `${url.protocol}//${url.hostname}`;

            // Import the VAPID private key using jose
            const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${vapidPrivateKey}\n-----END PRIVATE KEY-----`;
            const importedPrivateKey = await jose.importPKCS8(privateKeyPem, "ES256");

            // Create JWT for VAPID
            const jwt = await new jose.SignJWT({})
              .setProtectedHeader({ alg: "ES256", typ: "JWT" })
              .setAudience(audience)
              .setExpirationTime("12h")
              .setSubject(vapidSubject)
              .sign(importedPrivateKey);

            // Prepare the notification payload
            const notificationPayload = JSON.stringify({
              title: `💊 ${reminder.medication_name} Ready`,
              body: `Time for ${reminder.child_name}'s next dose`,
              icon: "/pwa-icon-192.png",
              badge: "/pwa-icon-192.png",
              data: {
                type: "medication_reminder",
                childId: reminder.child_id,
                medicationName: reminder.medication_name,
              },
            });

            // Send the push notification
            const res = await fetch(endpoint, {
              method: "POST",
              headers: {
                "TTL": "3600",
                "Content-Type": "application/octet-stream",
                "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
                "Urgency": "high",
              },
              body: notificationPayload,
            });

            if (!res.ok) {
              const errorText = await res.text();
              console.error("Push failed:", res.status, errorText);
              
              // If subscription is expired/invalid, delete it
              if (res.status === 410 || res.status === 404) {
                console.log("Subscription expired, removing...");
                await supabase
                  .from("push_subscriptions")
                  .delete()
                  .eq("user_id", reminder.user_id);
              }
            } else {
              console.log(`Push notification sent to user ${reminder.user_id}`);
              sentCount++;
            }
          } catch (pushError: any) {
            console.error(`Error sending push:`, pushError);
          }
        }
      } catch (reminderError: any) {
        console.error(`Error processing reminder ${reminder.id}:`, reminderError);
        errors.push(`Reminder ${reminder.id}: ${reminderError.message}`);
      }
    }

    console.log(`Medication reminder cron completed. Sent: ${sentCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${dueReminders.length} reminders`,
        sent: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Medication reminder cron error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
