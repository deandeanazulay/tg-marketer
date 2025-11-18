import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface SearchRequest {
  query: string;
  type?: 'all' | 'channels' | 'groups';
  limit?: number;
  min_members?: number;
  max_members?: number;
}

interface TelegramResult {
  chat_id: number;
  title: string;
  username?: string;
  kind: 'channel' | 'supergroup' | 'group';
  members?: number;
  description?: string;
  verified?: boolean;
  scam?: boolean;
  writable?: boolean;
}

// Simple MTProto-like API calls using fetch to Telegram Bot API and public endpoints
async function searchTelegram(request: SearchRequest): Promise<TelegramResult[]> {
  const results: TelegramResult[] = [];
  
  try {
    // Method 1: Use Telegram Bot API for public channel search
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (botToken) {
      const botResults = await searchWithBotAPI(botToken, request);
      results.push(...botResults);
    }
    
    // Method 2: Search public directories (TGStat, etc.)
    const directoryResults = await searchPublicDirectories(request);
    results.push(...directoryResults);
    
    // Method 3: If it's a username/link, resolve directly
    if (request.query.includes('@') || request.query.includes('t.me/')) {
      const resolved = await resolveUsername(request.query, botToken);
      if (resolved) results.push(resolved);
    }
    
    // Remove duplicates and apply filters
    const uniqueResults = removeDuplicates(results);
    return applyFilters(uniqueResults, request);
    
  } catch (error) {
    console.error('Telegram search error:', error);
    throw new Error(`Search failed: ${error.message}`);
  }
}

async function searchWithBotAPI(botToken: string, request: SearchRequest): Promise<TelegramResult[]> {
  const results: TelegramResult[] = [];
  
  try {
    // Use getChat for known usernames
    if (request.query.startsWith('@')) {
      const username = request.query.slice(1);
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: `@${username}` })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.result) {
          const chat = data.result;
          results.push({
            chat_id: chat.id,
            title: chat.title || chat.first_name || chat.username,
            username: chat.username,
            kind: chat.type === 'channel' ? 'channel' : chat.type === 'supergroup' ? 'supergroup' : 'group',
            members: chat.member_count,
            description: chat.description,
            verified: chat.is_verified,
            scam: chat.is_scam,
            writable: chat.type !== 'channel' || chat.permissions?.can_send_messages
          });
        }
      }
    }
  } catch (error) {
    console.warn('Bot API search failed:', error);
  }
  
  return results;
}

async function searchPublicDirectories(request: SearchRequest): Promise<TelegramResult[]> {
  const results: TelegramResult[] = [];
  
  try {
    // Search TGStat.com
    const tgstatResults = await searchTGStat(request.query);
    results.push(...tgstatResults);
    
    // Search other public directories
    const otherResults = await searchOtherDirectories(request.query);
    results.push(...otherResults);
    
  } catch (error) {
    console.warn('Directory search failed:', error);
  }
  
  return results;
}

async function searchTGStat(query: string): Promise<TelegramResult[]> {
  const results: TelegramResult[] = [];
  
  try {
    const response = await fetch(`https://tgstat.com/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TelegramSearchBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (!response.ok) return results;
    
    const html = await response.text();
    
    // Parse HTML to extract channel information
    const channelRegex = /<div[^>]*class="[^"]*channel-card[^"]*"[^>]*>[\s\S]*?<a[^>]*href="[^"]*\/channel\/([^"\/]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<div[^>]*class="[^"]*members[^"]*"[^>]*>([^<]+)<\/div>/gi;
    
    let match;
    while ((match = channelRegex.exec(html)) !== null) {
      const username = match[1];
      const title = match[2];
      const membersText = match[3];
      
      if (username && title) {
        // Parse member count
        let memberCount = 0;
        const memberMatch = membersText.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*([KkMm]?)/);
        if (memberMatch) {
          memberCount = parseFloat(memberMatch[1].replace(/,/g, ''));
          const unit = memberMatch[2]?.toLowerCase();
          if (unit === 'k') memberCount *= 1000;
          if (unit === 'm') memberCount *= 1000000;
        }
        
        results.push({
          chat_id: 0, // Will be resolved later
          title: title.trim(),
          username: username,
          kind: 'channel',
          members: Math.floor(memberCount),
          writable: false,
          verified: false,
          scam: false
        });
      }
    }
  } catch (error) {
    console.warn('TGStat search failed:', error);
  }
  
  return results;
}

async function searchOtherDirectories(query: string): Promise<TelegramResult[]> {
  const results: TelegramResult[] = [];
  
  try {
    // Search TLGrm.eu
    const response = await fetch(`https://tlgrm.eu/channels?search=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TelegramSearchBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (!response.ok) return results;
    
    const html = await response.text();
    
    // Parse HTML to extract channel information
    const channelRegex = /<a[^>]*href="[^"]*t\.me\/([^"\/]+)"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/gi;
    
    let match;
    while ((match = channelRegex.exec(html)) !== null) {
      const username = match[1];
      const title = match[2];
      
      if (username && title && !username.toLowerCase().includes('bot')) {
        results.push({
          chat_id: 0, // Will be resolved later
          title: title.trim(),
          username: username,
          kind: 'channel',
          writable: false,
          verified: false,
          scam: false
        });
      }
    }
  } catch (error) {
    console.warn('TLGrm search failed:', error);
  }
  
  return results;
}

async function resolveUsername(query: string, botToken?: string): Promise<TelegramResult | null> {
  try {
    let username = query;
    
    // Extract username from t.me links
    if (query.includes('t.me/')) {
      const match = query.match(/t\.me\/([^\/\?]+)/);
      if (match) username = match[1];
    }
    
    // Remove @ if present
    if (username.startsWith('@')) {
      username = username.slice(1);
    }
    
    if (botToken) {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: `@${username}` })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.result) {
          const chat = data.result;
          return {
            chat_id: chat.id,
            title: chat.title || chat.first_name || chat.username,
            username: chat.username,
            kind: chat.type === 'channel' ? 'channel' : chat.type === 'supergroup' ? 'supergroup' : 'group',
            members: chat.member_count,
            description: chat.description,
            verified: chat.is_verified,
            scam: chat.is_scam,
            writable: chat.type !== 'channel' || chat.permissions?.can_send_messages
          };
        }
      }
    }
  } catch (error) {
    console.warn('Username resolution failed:', error);
  }
  
  return null;
}

function removeDuplicates(results: TelegramResult[]): TelegramResult[] {
  const seen = new Set<string>();
  return results.filter(result => {
    const key = result.username || result.title.toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function applyFilters(results: TelegramResult[], request: SearchRequest): TelegramResult[] {
  return results.filter(result => {
    // Type filter
    if (request.type && request.type !== 'all') {
      if (request.type === 'channels' && result.kind !== 'channel') return false;
      if (request.type === 'groups' && result.kind === 'channel') return false;
    }
    
    // Member count filters
    if (request.min_members && result.members && result.members < request.min_members) return false;
    if (request.max_members && result.members && result.members > request.max_members) return false;
    
    return true;
  }).slice(0, request.limit || 50);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const body = await req.json()
    const searchRequest: SearchRequest = {
      query: body.query || '',
      type: body.type || 'all',
      limit: body.limit || 50,
      min_members: body.min_members,
      max_members: body.max_members
    }

    if (!searchRequest.query.trim()) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Searching Telegram for:', searchRequest.query)
    
    const results = await searchTelegram(searchRequest)
    
    return new Response(
      JSON.stringify({ results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Search error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})