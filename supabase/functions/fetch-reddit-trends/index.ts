import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface RedditPost {
  data: {
    title: string;
    url: string;
    thumbnail?: string;
    score: number;
    subreddit: string;
    permalink: string;
    created_utc: number;
  };
}

interface RedditTrend {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link: string;
  score: number;
  subreddit: string;
}

interface RedditTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
  scope: string;
}

// Simple in-memory token cache within the Edge Function instance
let cachedToken: { token: string; expiresAt: number } | null = null;
const TOKEN_REFRESH_BUFFER_SECONDS = 60; // Refresh 60s before expiry

function getEnv(name: string): string | undefined {
  try {
    return Deno.env.get(name);
  } catch (_) {
    return undefined;
  }
}

async function getRedditAccessToken(): Promise<string> {
  const clientId = getEnv("REDDIT_CLIENT_ID");
  const clientSecret = getEnv("REDDIT_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    console.error("Reddit OAuth secrets are missing");
    throw new Error("Missing Reddit credentials");
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    cachedToken &&
    cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_SECONDS > now &&
    cachedToken.token
  ) {
    return cachedToken.token;
  }

  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  const resp = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "stylo.se-ai-stylist/1.0 (+https://www.stylo.se)",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "read",
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("Reddit OAuth token fetch failed", resp.status, text);
    throw new Error(`Reddit OAuth failed: ${resp.status}`);
  }

  const tokenJson = (await resp.json()) as RedditTokenResponse;
  const expiresAt = now + (tokenJson.expires_in || 3600);
  cachedToken = { token: tokenJson.access_token, expiresAt };

  console.log("Obtained Reddit OAuth token (cached)", {
    expires_in: tokenJson.expires_in,
    scope: tokenJson.scope,
  });

  return tokenJson.access_token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support both GET and POST methods
    let query = "";
    let limit = 15;

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      query = body.query || "";
      limit = body.limit || 15;
    } else if (req.method === "GET") {
      const url = new URL(req.url);
      query = url.searchParams.get("query") || "";
      limit = parseInt(url.searchParams.get("limit") || "15");
    }

    console.log("Fetching Reddit fashion trends (OAuth)", { query, limit });

    // Get OAuth token (cached)
    let accessToken: string;
    try {
      accessToken = await getRedditAccessToken();
    } catch (oauthError) {
      console.warn("Reddit OAuth unavailable, returning graceful fallback");
      return new Response(
        JSON.stringify({
          success: false,
          query,
          total_posts: 0,
          trending_styles: [],
          trending_keywords: [],
          top_posts: [],
          ai_context:
            "Reddit-data otillgänglig (OAuth). Fortsätter med Pinterest och Instagram om tillgängligt.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch top posts from fashion subreddits via OAuth API
    const oauthUrl = `https://oauth.reddit.com/r/streetwear+malefashionadvice+femalefashionadvice/top?t=week&limit=${limit}&raw_json=1`;

    const response = await fetch(oauthUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "stylo.se-ai-stylist/1.0 (+https://www.stylo.se)",
        Accept: "application/json",
        Referer: "https://www.stylo.se",
      },
    });

    if (!response.ok) {
      console.warn("Reddit API error", response.status);
      return new Response(
        JSON.stringify({
          success: false,
          query,
          total_posts: 0,
          trending_styles: [],
          trending_keywords: [],
          top_posts: [],
          ai_context:
            "Reddit-data otillgänglig. Fortsätter med Pinterest och Instagram om tillgängligt.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const posts: RedditPost[] = data?.data?.children || [];

    console.log(`Found ${posts.length} Reddit posts`);

    // Extract fashion keywords from titles
    const fashionKeywords = new Set<string>();
    const trendingStyles = new Set<string>();

    // Filter and transform posts into trends
    const trends: RedditTrend[] = posts
      .filter((post) => {
        const title = post.data.title.toLowerCase();
        // Filter out non-fashion posts
        return (
          title.includes("outfit") ||
          title.includes("fit") ||
          title.includes("style") ||
          title.includes("wear") ||
          title.includes("look") ||
          title.includes("fashion")
        );
      })
      .map((post, index) => {
        const title = post.data.title;

        // Extract keywords
        const words = title.toLowerCase().split(/\s+/);
        words.forEach((word) => {
          if (word.length > 4 && !["outfit", "style", "fashion"].includes(word)) {
            fashionKeywords.add(word);
          }
        });

        // Detect style categories
        if (title.toLowerCase().includes("street")) trendingStyles.add("streetwear");
        if (title.toLowerCase().includes("casual")) trendingStyles.add("casual");
        if (title.toLowerCase().includes("formal")) trendingStyles.add("formal");
        if (title.toLowerCase().includes("smart")) trendingStyles.add("smart-casual");
        if (title.toLowerCase().includes("vintage")) trendingStyles.add("vintage");
        if (title.toLowerCase().includes("minimal")) trendingStyles.add("minimalist");

        return {
          id: `reddit-${Date.now()}-${index}`,
          title: post.data.title,
          description: `Popular on r/${post.data.subreddit} - ${post.data.score} upvotes`,
          image_url:
            post.data.thumbnail && post.data.thumbnail.startsWith("http")
              ? post.data.thumbnail
              : "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80",
          link: `https://reddit.com${post.data.permalink}`,
          score: post.data.score,
          subreddit: post.data.subreddit,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Generate AI context from Reddit trends
    const keywordArray = Array.from(fashionKeywords).slice(0, 15);
    const styleArray = Array.from(trendingStyles);

    const ai_context =
      trends.length > 0
        ?
            `Reddit Fashion Trends (week): Popular styles include ${styleArray.join(
              ", "
            )}. ` +
          `Trending topics: ${keywordArray.join(", ")}. ` +
          `Community favorites from r/streetwear, r/malefashionadvice, and r/femalefashionadvice.`
        : "No specific Reddit fashion trends found for this query.";

    console.log("Reddit AI context generated");

    return new Response(
      JSON.stringify({
        success: true,
        query,
        total_posts: trends.length,
        trending_styles: styleArray,
        trending_keywords: keywordArray,
        top_posts: trends,
        ai_context,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching Reddit trends:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        ai_context:
          "Kunde inte hämta Reddit-trender. Fortsätter med övriga källor.",
        top_posts: [],
        trending_styles: [],
        trending_keywords: [],
        query: "",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
