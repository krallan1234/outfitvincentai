import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { destination, startDate, endDate, occasion, wardrobeItems } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating packing list for trip:', { destination, startDate, endDate, occasion });

    // Calculate trip duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const wardrobeDescription = wardrobeItems?.map((item: any) => 
      `${item.category} (${item.color || 'unknown color'}, ${item.brand || 'no brand'})`
    ).join(', ') || 'No specific wardrobe items provided';

    const prompt = `You are a professional travel packing stylist. Create a detailed ${days}-day packing list for a trip to ${destination || 'destination'}.

Trip Details:
- Duration: ${days} days (${startDate} to ${endDate})
- Occasion: ${occasion || 'General travel'}
- Available wardrobe: ${wardrobeDescription}

Provide a practical packing list with:
1. **Daily Outfits**: Suggest ${days} complete outfit combinations
2. **Essentials**: Key items they should bring
3. **Weather Considerations**: What to pack based on season/destination
4. **Mix & Match Tips**: How to maximize outfit combinations

Keep it concise and actionable. Format as a clear list.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a professional travel stylist creating practical, organized packing lists.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to generate packing list');
    }

    const data = await response.json();
    const packingList = data.choices?.[0]?.message?.content || 'No packing suggestions available';

    console.log('Packing list generated successfully');

    return new Response(
      JSON.stringify({ packingList, days }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-packing-list:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate packing list' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
