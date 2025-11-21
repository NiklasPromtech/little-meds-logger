import { buildPushHTTPRequest } from 'https://esm.sh/@pushforge/builder@1.0.0?target=deno';
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
      const { childId, medicationName, givenBy } = body as NotificationPayload;
      console.log('Notification request:', { childId, medicationName, givenBy });

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

      console.log('Shares found:', shares);

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

      console.log('Child found:', child);

      // Collect all user IDs (shares + creator, excluding the one who logged)
      const userIds = [...(shares?.map(s => s.user_id) || [])];
      if (child.created_by !== givenBy) {
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
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

      if (!vapidSubject || !vapidPrivateKey) {
        console.error('Missing VAPID configuration');
        return new Response(JSON.stringify({ error: 'Push not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const notificationMessage = {
        payload: {
          title: `${child.name} - Medication Logged`,
          body: `${medicationName} was given`,
          icon: '/pwa-icon-192.png',
          badge: '/pwa-icon-192.png',
        },
        options: {
          ttl: 3600,
          urgency: 'normal',
        },
        adminContact: vapidSubject,
      } as const;

      const sendResults = await Promise.allSettled(
        subscriptions.map(async ({ subscription }) => {
          const { endpoint, headers, body } = await buildPushHTTPRequest({
            privateJWK: vapidPrivateKey,
            subscription,
            message: notificationMessage,
          });

          const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body,
          });

          if (!res.ok) {
            throw new Error(`Push failed with status ${res.status}`);
          }

          return true;
        })
      );

      const sentCount = sendResults.filter((r) => r.status === 'fulfilled').length;
      const failedCount = sendResults.length - sentCount;

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
