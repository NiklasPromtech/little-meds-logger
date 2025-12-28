import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChildProfile {
  name: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  allergies?: string;
  diagnoses?: string;
}

interface ActivityItem {
  type: "medication" | "measurement";
  name: string;
  timestamp: string;
  value?: string;
  quantity?: string;
  notes?: string;
  dosage?: string;
}

interface ReviewRequest {
  child: ChildProfile;
  recentActivity: ActivityItem[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { child, recentActivity }: ReviewRequest = await req.json();

    console.log('AI Health Review request:', { child: child.name, activityCount: recentActivity.length });

    // Format the activity data for the AI
    const activitySummary = recentActivity.map(item => {
      if (item.type === "medication") {
        return `- ${item.timestamp}: Given ${item.name}${item.dosage ? ` (${item.dosage})` : ''}${item.quantity ? `, quantity: ${item.quantity}` : ''}${item.notes ? `, notes: ${item.notes}` : ''}`;
      } else {
        return `- ${item.timestamp}: ${item.name}: ${item.value}${item.notes ? `, notes: ${item.notes}` : ''}`;
      }
    }).join('\n');

    const prompt = `You are a helpful medical information assistant. Based on the following child's health data, provide a brief assessment.

IMPORTANT DISCLAIMER: This is NOT medical advice. This is only for informational purposes. Always consult a healthcare professional for medical decisions.

Child Information:
- Name: ${child.name}
${child.age ? `- Age: ${child.age} years old` : ''}
${child.gender ? `- Gender: ${child.gender}` : ''}
${child.allergies ? `- Known allergies: ${child.allergies}` : ''}
${child.diagnoses ? `- Known conditions/diagnoses: ${child.diagnoses}` : ''}

Recent Activity (last 48 hours):
${activitySummary || 'No recent activity logged'}

Based on this information, provide:
1. A severity rating from 1-5:
   - 1: Everything looks normal, continue monitoring
   - 2: Mild concern, watch for changes
   - 3: Moderate concern, consider calling your doctor
   - 4: High concern, contact your doctor soon
   - 5: Urgent, seek medical attention immediately

2. A brief explanation (2-3 sentences) of your assessment.

3. Any specific things to watch for.

Respond in JSON format:
{
  "severity": <number 1-5>,
  "assessment": "<brief assessment>",
  "watchFor": "<things to monitor>"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful medical information assistant. You provide informational assessments but always emphasize that users should consult healthcare professionals for actual medical advice.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI response:', content);

    // Parse the JSON response from AI
    let result;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      result = {
        severity: 2,
        assessment: content,
        watchFor: 'Monitor symptoms and consult a healthcare professional if concerned.',
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-health-review:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
