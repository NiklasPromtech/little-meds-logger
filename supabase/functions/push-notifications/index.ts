import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as jose from 'https://deno.land/x/jose@v5.9.6/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscriptionPayload {
  subscription: any;
}

interface NotificationPayload {
  childId: string;
  type: 'medication' | 'measurement' | 'note' | 'ai_review';
  itemName?: string;
  value?: string | number;
  severity?: number;
  loggedBy: string;
}

function getNotificationContent(
  type: string,
  childName: string,
  itemName?: string,
  value?: string | number,
  severity?: number
): { title: string; body: string } {
  switch (type) {
    case 'medication':
      return {
        title: `💊 ${childName}`,
        body: `${itemName || 'Medication'} was given`,
      };
    case 'measurement':
      return {
        title: `📏 ${childName}`,
        body: value ? `${itemName}: ${value}` : `${itemName} recorded`,
      };
    case 'note':
      return {
        title: `📝 ${childName}`,
        body: 'New note added',
      };
    case 'ai_review':
      const severityText = severity ? ` (Level ${severity}/5)` : '';
      return {
        title: `🤖 ${childName}`,
        body: `AI Health Review completed${severityText}`,
      };
    default:
      return {
        title: childName,
        body: 'New activity logged',
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Push notification request received:', req.method, req.url);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const token = authHeader.replace('Bearer ', '').trim();

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Unauthorized user:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    const body = await req.json();
    const action = body.action;

    // Subscribe to push notifications
    if (action === 'subscribe' && req.method === 'POST') {
      const { subscription } = body as SubscriptionPayload;
      console.log('Subscribe request received for user:', user.id);
      console.log('Subscription data:', JSON.stringify(subscription));
      
      // Delete existing subscriptions for this user first
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);
      
      // Insert new subscription
      const { error: insertError } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          subscription: subscription,
        });

      if (insertError) {
        console.error('Error saving subscription:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to save subscription', details: insertError }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Subscription saved successfully');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send notification to other caregivers
    if (action === 'notify' && req.method === 'POST') {
      const { childId, type, itemName, value, severity, loggedBy } = body as NotificationPayload;
      console.log('Notification request:', { childId, type, itemName, value, severity, loggedBy });

      // Get all users with access to this child (except the one who logged)
      const { data: shares, error: sharesError } = await supabase
        .from('child_shares')
        .select('user_id')
        .eq('child_id', childId)
        .neq('user_id', loggedBy);

      if (sharesError) {
        console.error('Error fetching shares:', sharesError);
        return new Response(JSON.stringify({ error: 'Failed to fetch shares' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Shares found:', shares);

      // Get child creator and name
      const { data: child, error: childError } = await supabase
        .from('children')
        .select('created_by, name')
        .eq('id', childId)
        .single();

      if (childError) {
        console.error('Error fetching child:', childError);
        return new Response(JSON.stringify({ error: 'Failed to fetch child' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Child found:', child);

      // Collect all user IDs (shares + creator, excluding the one who logged)
      const userIds = [...(shares?.map(s => s.user_id) || [])];
      if (child.created_by !== loggedBy) {
        userIds.push(child.created_by);
      }

      console.log('Target user IDs for notification:', userIds);

      if (userIds.length === 0) {
        console.log('No users to notify');
        return new Response(JSON.stringify({ success: true, sent: 0, message: 'No users to notify' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get subscriptions for all these users
      const { data: subscriptions, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .in('user_id', userIds);

      console.log('Subscriptions found:', subscriptions?.length || 0);

      if (subsError) {
        console.error('Error fetching subscriptions:', subsError);
        return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log('No subscriptions found for target users');
        return new Response(JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const vapidSubject = Deno.env.get('VAPID_SUBJECT');
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

      if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
        console.error('Missing VAPID configuration');
        return new Response(JSON.stringify({ error: 'Push not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('VAPID keys loaded, preparing notifications for', subscriptions.length, 'subscriptions');

      // Get notification content based on type
      const { title, body: notifBody } = getNotificationContent(
        type,
        child.name,
        itemName,
        value,
        severity
      );

      const sendResults = await Promise.allSettled(
        subscriptions.map(async ({ subscription }) => {
          try {
            console.log('Processing subscription:', JSON.stringify(subscription));
            
            const endpoint = subscription.endpoint;
            const p256dh = subscription.keys.p256dh;
            const auth = subscription.keys.auth;

            // Extract audience from endpoint
            const url = new URL(endpoint);
            const audience = `${url.protocol}//${url.hostname}`;

            console.log('Audience:', audience);

            // Import the VAPID private key using jose
            const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${vapidPrivateKey}\n-----END PRIVATE KEY-----`;
            const importedPrivateKey = await jose.importPKCS8(privateKeyPem, 'ES256');

            console.log('Private key imported');

            // Create JWT for VAPID
            const jwt = await new jose.SignJWT({})
              .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
              .setAudience(audience)
              .setExpirationTime('12h')
              .setSubject(vapidSubject)
              .sign(importedPrivateKey);

            console.log('JWT created');

            // Prepare the notification payload
            const notificationPayload = JSON.stringify({
              title,
              body: notifBody,
              icon: '/pwa-icon-192.png',
              badge: '/pwa-icon-192.png',
              data: {
                childId,
                type,
              },
            });

            console.log('Notification payload:', notificationPayload);

            // Send the push notification
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'TTL': '3600',
                'Content-Type': 'application/octet-stream',
                'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
                'Urgency': 'normal',
              },
              body: notificationPayload,
            });

            console.log('Push response status:', res.status, res.statusText);

            if (!res.ok) {
              const errorText = await res.text();
              console.error('Push failed:', res.status, errorText);
              throw new Error(`Push failed with status ${res.status}: ${errorText}`);
            }

            console.log('Push sent successfully');
            return true;
          } catch (error) {
            console.error('Error in subscription push:', error);
            throw error;
          }
        })
      );

      const sentCount = sendResults.filter((r) => r.status === 'fulfilled').length;
      const failedCount = sendResults.length - sentCount;

      console.log('Raw push sendResults:', JSON.stringify(sendResults, null, 2));

      sendResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Notification ${index} failed:`, result.reason);
        }
      });

      console.log(`Notifications sent: ${sentCount}, failed: ${failedCount}`);

      return new Response(JSON.stringify({ 
        success: true,
        sent: sentCount,
        failed: failedCount,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in push-notifications function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
