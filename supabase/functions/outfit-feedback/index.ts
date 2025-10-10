import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items } = await req.json();

    if (!items || items.length < 2) {
      return new Response(
        JSON.stringify({ 
          feedback: 'Select at least 2 items to get feedback', 
          score: 0 
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    console.log(`Analyzing ${items.length} items for real-time feedback`);

    // Create a concise prompt for quick feedback
    const prompt = `
      As a fashion expert, provide quick feedback on this outfit combination:
      
      ${items.map((item: any, idx: number) => `${idx + 1}. ${item.category} - ${item.color} - ${item.style || 'casual'}`).join('\n')}
      
      Provide:
      1. A brief 1-sentence feedback (max 20 words) about color harmony, style match, and overall cohesiveness
      2. A match score from 0-100 (higher is better)
      
      Format your response as JSON:
      {
        "feedback": "your brief feedback here",
        "score": 85
      }
    `;

    // Call Gemini for quick analysis
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7,
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', geminiResponse.status);
      throw new Error('Failed to get AI feedback');
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1].trim());
      } else {
        result = JSON.parse(content.trim());
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Fallback response
      result = {
        feedback: 'Nice combination! The items complement each other well.',
        score: 75
      };
    }

    console.log(`Feedback generated: ${result.score}% match`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Outfit feedback error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        feedback: 'Unable to analyze outfit at this time',
        score: 50
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
