import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface StylistRequest {
  reddit_trends?: string;
  pinterest_data?: string;
  instagram_trends?: string;
  user_clothes?: any[];
  selected_items?: any[];
  prompt?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      reddit_trends = '',
      pinterest_data = '',
      instagram_trends = '',
      user_clothes = [],
      selected_items = [],
      prompt = ''
    }: StylistRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('AI Stylist analyzing trends and user style...');

    // Build comprehensive wardrobe description
    const wardrobeDesc = user_clothes.length > 0
      ? `\n\nANVÄNDARENS GARDEROB (${user_clothes.length} plagg):\n` +
        user_clothes.map(item => {
          const analysis = item.analysis || {};
          return `- ${analysis.category || item.category || 'unknown'}: ${analysis.color || item.color || 'färg okänd'}, ${analysis.style || item.style || 'stil okänd'}`;
        }).join('\n')
      : '';

    const selectedDesc = selected_items.length > 0
      ? `\n\nVALDA PLAGG:\n` +
        selected_items.map(item => {
          const analysis = item.analysis || {};
          return `- ${analysis.category || item.category}: ${analysis.color || item.color}`;
        }).join('\n')
      : '';

    // Create AI prompt
    const systemPrompt = `Du är en digital stylist och trendanalytiker som skapar outfits baserat på användarens garderob och aktuella modetrender från Reddit, Pinterest och Instagram.

DITT UPPDRAG:
1. Analysera trenddata från alla källor
2. Identifiera överlappande trender
3. Förstå användarens stil från deras garderob
4. Skapa 3 kompletta outfit-förslag som kombinerar användarens plagg med aktuella trender
5. Förklara varför varje outfit är trendig just nu

VIKTIGA REGLER:
- Använd ENDAST plagg från användarens garderob
- Skapa kompletta outfits: topp+byxor+skor ELLER klänning+skor
- Prioritera stilar som återkommer i flera trendkällor
- Alla beskrivningar på svenska
- Returnera giltig JSON enligt formatet`;

    const userPrompt = `${prompt ? `ANVÄNDARENS ÖNSKEMÅL: ${prompt}\n\n` : ''}TRENDDATA:

REDDIT TRENDS:
${reddit_trends}

PINTEREST DATA:
${pinterest_data}

INSTAGRAM TRENDS:
${instagram_trends}
${wardrobeDesc}
${selectedDesc}

Skapa outfit-förslag i följande JSON-format:
{
  "user_style_summary": "Analys av användarens stil baserat på garderob",
  "reddit_trend_summary": "Sammanfattning av Reddit-trender",
  "combined_trend_summary": "Överlappande trender mellan källor",
  "outfits": [
    {
      "id": 1,
      "style_name": "Stilnamn",
      "items": [
        {"type": "jacka", "description": "Beskrivning", "item_id": "uuid-från-garderob"},
        {"type": "byxor", "description": "Beskrivning", "item_id": "uuid-från-garderob"}
      ],
      "trend_reason": "Förklaring av trendkoppling",
      "trend_sources": ["reddit_trends", "pinterest_data"]
    }
  ]
}`;

    console.log('Calling Lovable AI for styling analysis...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('AI credits depleted. Please add credits to your workspace.');
      }
      
      throw new Error(`AI styling failed: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI stylist');
    }

    console.log('AI Stylist response received');

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid response format from AI');
    }

    return new Response(
      JSON.stringify({
        success: true,
        styling_analysis: parsedContent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('AI Stylist error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
