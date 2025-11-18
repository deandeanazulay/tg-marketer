import { DataStore, BootstrapConfig } from '../data/types';
import { createStore } from '../data';
import { pgAppConfig } from '../data/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';

// Helper to decode JWT payload (simplified, no signature verification here)
function decodeJwtPayload(token: string): { telegram_id: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts, 'base64url').toString());
    return payload;
  } catch (e) {
    console.error('Failed to decode JWT payload:', e);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    const token = authHeader.split(' ');
    const payload = decodeJwtPayload(token);

    if (!payload || !payload.telegram_id) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const ownerId = payload.telegram_id;
    const { templateId, destinationIds, variables } = req.body;
    
    if (!templateId || !destinationIds || !Array.isArray(destinationIds) || destinationIds.length === 0) {
      return res.status(400).json({ error: 'Invalid request data: templateId and destinationIds are required' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Get app config to determine data adapter
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return res.status(500).json({ error: 'DATABASE_URL not configured for data adapter lookup' });
    }
    const client = postgres(connectionString);
    const db = drizzle(client, { schema: { pgAppConfig } });
    const appConfigRow = await db.query.pgAppConfig.findFirst({
      where: eq(pgAppConfig.app, 'miniapp'),
    });
    const cfg: BootstrapConfig = appConfigRow ? { ...appConfigRow.config as BootstrapConfig } : {
      adapters: { data: 'mock' }, features: {}, ui: { brand: '', accent: '' }, defaults: { mode: 'demo' }
    };

    const dataStore: DataStore = await createStore(cfg, 'real', ownerId); // Always 'real' for server-side operations

    const template = await dataStore.getTemplate(templateId, ownerId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const destinations = await Promise.all(destinationIds.map(id => dataStore.getDestination(id, ownerId)));
    const validDestinations = destinations.filter(d => d && d.can_send) as Required<typeof destinations[number]>[];

    if (validDestinations.length === 0) {
      return res.status(400).json({ error: 'No valid destinations selected or bot cannot send to them.' });
    }

    // Create a new campaign
    const newCampaign = await dataStore.createCampaign({
      owner_id: ownerId,
      template_id: template.id,
      status: 'running',
    });

    // Create campaign items
    const campaignItems = validDestinations.map(dest => ({
      campaign_id: newCampaign.id,
      destination_id: dest.id,
      status: 'pending' as const,
    }));
    await dataStore.createCampaignItems(campaignItems);

    // Replace variables in template content
    let messageContent = template.content;
    Object.entries(variables || {}).forEach(([key, value]) => {
      messageContent = messageContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // Simulate sending messages via Bot API and update campaign items
    const sendResults = await Promise.all(validDestinations.map(async (dest) => {
      try {
        // In a real scenario, this would be an actual Telegram Bot API call
        // Example: await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { ... });
        
        // Mock sending for now
        const isSuccess = Math.random() > 0.1; // 90% success rate
        const status = isSuccess ? 'sent' : 'failed';
        const error = isSuccess ? undefined : 'Mock sending failed';

        const campaignItem = campaignItems.find(item => item.destination_id === dest.id);
        if (campaignItem) {
          await dataStore.updateCampaignItem(campaignItem.id, status, error, new Date());
        }

        return { destination_id: dest.id, status, error };
      } catch (sendError: any) {
        const campaignItem = campaignItems.find(item => item.destination_id === dest.id);
        if (campaignItem) {
          await dataStore.updateCampaignItem(campaignItem.id, 'failed', sendError.message, new Date());
        }
        return { destination_id: dest.id, status: 'failed', error: sendError.message };
      }
    }));

    // Update campaign status (e.g., to 'done' if all sent, 'failed' if all failed, or 'running' if mixed)
    const allSent = sendResults.every(r => r.status === 'sent');
    const anyFailed = sendResults.some(r => r.status === 'failed');
    let campaignFinalStatus: Campaign['status'] = 'running';
    if (allSent) {
      campaignFinalStatus = 'done';
    } else if (anyFailed && sendResults.every(r => r.status === 'failed')) {
      campaignFinalStatus = 'failed';
    } else if (anyFailed) {
      campaignFinalStatus = 'running'; // Some sent, some failed
    }

    await dataStore.updateCampaignStatus(newCampaign.id, ownerId, campaignFinalStatus, new Date());

    res.json({
      success: true,
      campaign_id: newCampaign.id,
      results: sendResults,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}