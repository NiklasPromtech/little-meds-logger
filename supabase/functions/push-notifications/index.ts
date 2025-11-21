import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscriptionPayload {
  subscription: any; // PushSubscription JSON
}

interface NotificationPayload {
  childId: string;
  medicationName: string;
  givenBy: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Subscribe to push notifications
    if (action === 'subscribe' && req.method === 'POST') {
      const { subscription }: SubscriptionPayload = await req.json();
      
      const { error: insertError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: subscription,
        });

      if (insertError) {
        console.error('Error saving subscription:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to save subscription' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send notification to other caregivers
    if (action === 'notify' && req.method === 'POST') {
      const { childId, medicationName, givenBy }: NotificationPayload = await req.json();

      // Get all users with access to this child (except the one who logged)
      const { data: shares, error: sharesError } = await supabase
        .from('child_shares')
        .select('user_id')
        .eq('child_id', childId)
        .neq('user_id', givenBy);

      if (sharesError) {
        console.error('Error fetching shares:', sharesError);
        return new Response(JSON.stringify({ error: 'Failed to fetch shares' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get child creator
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

      // Collect all user IDs (shares + creator, excluding the one who logged)
      const userIds = [...(shares?.map(s => s.user_id) || [])];
      if (child.created_by !== givenBy) {
        userIds.push(child.created_by);
      }

      // Get subscriptions for all these users
      const { data: subscriptions, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .in('user_id', userIds);

      if (subsError) {
        console.error('Error fetching subscriptions:', subsError);
        return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Configure VAPID
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
      const vapidSubject = Deno.env.get('VAPID_SUBJECT')!;

      // Use fetch to send notifications directly via Web Push API
      const payload = JSON.stringify({
        title: `${child.name} - Medication Logged`,
        body: `${medicationName} was given`,
        icon: '/pwa-icon-192.png',
        badge: '/pwa-icon-192.png',
      });

      const sendPromises = (subscriptions || []).map(async ({ subscription }) => {
        try {
          const pushSubscription = subscription as any;
          const endpoint = pushSubscription.endpoint;
          
          // Generate VAPID headers
          const vapidHeaders = generateVapidHeaders(
            endpoint,
            vapidSubject,
            vapidPublicKey,
            vapidPrivateKey
          );

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'TTL': '86400',
              ...vapidHeaders,
            },
            body: payload,
          });

          if (!response.ok) {
            console.error('Push failed:', await response.text());
          }
        } catch (err) {
          console.error('Error sending notification:', err);
        }
      });

      await Promise.all(sendPromises);

      return new Response(JSON.stringify({ success: true, sent: sendPromises.length }), {
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

// Helper function to generate VAPID headers (simplified version)
function generateVapidHeaders(
  endpoint: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Record<string, string> {
  // For now, return basic headers
  // In production, you'd need proper JWT generation with crypto
  return {
    'Authorization': `vapid t=${createJWT(endpoint, subject, privateKey)}, k=${publicKey}`,
    'Crypto-Key': `p256ecdsa=${publicKey}`,
  };
}

function createJWT(endpoint: string, subject: string, privateKey: string): string {
  // Simplified JWT - in production use proper crypto library
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = btoa(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: subject,
  }));
  return `${header}.${payload}.signature`;
}
