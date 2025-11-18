import { createStore } from '../data';
import { BootstrapConfig } from '../data/types';

// Helper to decode JWT payload (simplified, no signature verification here)
function decodeJwtPayload(token: string): { telegram_id: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
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
    const token = authHeader.split(' ')[1];
    const payload = decodeJwtPayload(token);

    if (!payload || !payload.telegram_id) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const ownerId = payload.telegram_id;

    // Get bootstrap config to determine data adapter
    const cfg: BootstrapConfig = {
      adapters: { data: 'mock' }, // Default to mock for demo seeding
      features: {},
      ui: { brand: 'TG Marketer', accent: '#0088cc' },
      defaults: { mode: 'demo' }
    };

    const dataStore = await createStore(cfg, 'demo', ownerId);

    // Check if user already has demo data
    const existingTemplates = await dataStore.getTemplates(ownerId);
    if (existingTemplates.length > 0) {
      return res.json({ message: 'Demo data already exists', seeded: false });
    }

    // Seed demo templates
    const demoTemplates = [
      {
        owner_id: ownerId,
        name: 'Welcome Message',
        content: 'Hello {{name}}! Welcome to our {{channel_name}}. We\'re excited to have you here! 🎉',
        variables: { name: 'User', channel_name: 'Channel' }
      },
      {
        owner_id: ownerId,
        name: 'Product Launch',
        content: '🚀 Big news! We\'re launching {{product_name}} on {{launch_date}}. Get {{discount}}% off with code {{promo_code}}!',
        variables: { product_name: 'New Product', launch_date: 'Tomorrow', discount: '20', promo_code: 'LAUNCH20' }
      },
      {
        owner_id: ownerId,
        name: 'Event Reminder',
        content: '📅 Don\'t forget! {{event_name}} is happening {{when}}. Location: {{location}}. See you there!',
        variables: { event_name: 'Demo Event', when: 'this Friday at 7 PM', location: 'Online' }
      }
    ];

    for (const template of demoTemplates) {
      await dataStore.createTemplate(template);
    }

    // Seed demo destinations
    const demoDestinations = [
      {
        owner_id: ownerId,
        chat_id: '-1001234567890',
        title: 'Demo Marketing Channel',
        type: 'channel' as const,
        can_send: true
      },
      {
        owner_id: ownerId,
        chat_id: '-1001234567891',
        title: 'Product Updates Group',
        type: 'group' as const,
        can_send: true
      },
      {
        owner_id: ownerId,
        chat_id: '-1001234567892',
        title: 'Community Chat',
        type: 'group' as const,
        can_send: false
      },
      {
        owner_id: ownerId,
        chat_id: '-1001234567893',
        title: 'Announcements Channel',
        type: 'channel' as const,
        can_send: true
      }
    ];

    for (const destination of demoDestinations) {
      await dataStore.createDestination(destination);
    }

    res.json({ 
      message: 'Demo data seeded successfully', 
      seeded: true,
      templates: demoTemplates.length,
      destinations: demoDestinations.length
    });
  } catch (error) {
    console.error('Demo seed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}