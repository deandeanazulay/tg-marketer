import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash, createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface TelegramInitData {
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
  };
  chat?: {
    id: number;
    type: string;
    title?: string;
    username?: string;
  };
  auth_date: number;
  hash: string;
}

function verifyTelegramWebAppData(initData: string, botToken: string): TelegramInitData | null {
  try {
    console.log('🔍 Verifying Telegram Web App data...');
    
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    if (!hash) {
      console.error('❌ No hash in initData');
      return null;
    }
    
    // Create data-check-string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    console.log('📝 Data check string created');
    
    // Create secret key
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    
    // Calculate expected hash
    const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    if (expectedHash !== hash) {
      console.error('❌ Hash verification failed');
      console.log('Expected:', expectedHash);
      console.log('Received:', hash);
      return null;
    }
    
    console.log('✅ Hash verification successful');
    
    // Parse user data
    const userData = urlParams.get('user');
    const chatData = urlParams.get('chat');
    const authDate = parseInt(urlParams.get('auth_date') || '0');
    
    // Check auth_date (should be within last hour for security)
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 3600) {
      console.error('❌ Auth data too old:', now - authDate, 'seconds');
      return null;
    }
    
    console.log('✅ Auth date valid');
    
    return {
      user: userData ? JSON.parse(userData) : undefined,
      chat: chatData ? JSON.parse(chatData) : undefined,
      auth_date: authDate,
      hash
    };
  } catch (error) {
    console.error('❌ Error verifying Telegram data:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Telegram init verification request');
    
    const { initData } = await req.json()
    
    if (!initData) {
      console.error('❌ Missing initData');
      return new Response(
        JSON.stringify({ error: 'Missing initData' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get bot token from environment
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      console.error('❌ Bot token not configured');
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify Telegram data
    const telegramData = verifyTelegramWebAppData(initData, botToken)
    if (!telegramData || !telegramData.user) {
      console.error('❌ Invalid Telegram data');
      return new Response(
        JSON.stringify({ error: 'Invalid Telegram data' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Telegram data verified for user:', telegramData.user.first_name);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Upsert user profile
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        telegram_id: telegramData.user.id,
        username: telegramData.user.username,
        first_name: telegramData.user.first_name,
        last_name: telegramData.user.last_name,
        language_code: telegramData.user.language_code,
        is_premium: telegramData.user.is_premium || false,
        role: 'user',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'telegram_id'
      })

    if (upsertError) {
      console.error('❌ Error upserting profile:', upsertError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Profile upserted successfully');

    // Generate JWT with telegram_id
    const payload = {
      telegram_id: telegramData.user.id,
      username: telegramData.user.username,
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }

    // For now, return the payload directly
    // In production, you'd sign this with your JWT secret
    const jwt = btoa(JSON.stringify(payload)); // Simple base64 encoding for demo

    console.log('✅ JWT generated for user:', telegramData.user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        user: telegramData.user,
        jwt
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ Verification error:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})