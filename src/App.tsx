import { useEffect, useState } from 'react';
import { telegram } from './lib/telegram';
import { Lobby } from './pages/Lobby';
import { Accounts } from './pages/Accounts';
import { Campaigns } from './pages/Campaigns';
import { Compose } from './pages/Compose';
import { Destinations } from './pages/Destinations';
import { Settings } from './pages/Settings';
import { ModeBadge } from './components/ModeBadge';
import { getMockDataStore } from './data/mock';
import type { DataStore } from './types';

type Page = 'lobby' | 'destinations' | 'compose' | 'campaigns' | 'accounts' | 'settings';
type Mode = 'demo' | 'real' | null;

const DestinationsIcon = ({ className, active }: { className?: string; active?: boolean }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const ComposeIcon = ({ className, active }: { className?: string; active?: boolean }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const CampaignsIcon = ({ className, active }: { className?: string; active?: boolean }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"/>
    <path d="M18 17V9"/>
    <path d="M13 17V5"/>
    <path d="M8 17v-3"/>
  </svg>
);

const SettingsIcon = ({ className, active }: { className?: string; active?: boolean }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v6m0 6v6m9-9h-6m-6 0H1"/>
  </svg>
);

function App() {
  const [mode, setMode] = useState<Mode>(null);
  const [currentPage, setCurrentPage] = useState<Page>('lobby');
  const [dataStore, setDataStore] = useState<DataStore | null>(null);
  const [ownerId, setOwnerId] = useState<string>('demo-user');
  const theme = telegram.getTheme();

  useEffect(() => {
    const initApp = async () => {
      const isInTelegram = await telegram.init();

      if (isInTelegram) {
        const user = telegram.getUser();
        if (user) {
          setOwnerId(user.id.toString());
        }
      }

      const savedMode = localStorage.getItem('tg-marketer-mode') as Mode;
      if (savedMode) {
        setMode(savedMode);
        setCurrentPage('destinations');
        initializeDataStore(savedMode);
      }
    };

    initApp();
  }, []);

  const initializeDataStore = async (selectedMode: Mode) => {
    if (selectedMode === 'demo') {
      const mockStore = getMockDataStore();

      const existingTemplates = await mockStore.getTemplates(ownerId);
      if (existingTemplates.length === 0) {
        await seedDemoData(mockStore);
      }

      setDataStore(mockStore);
    } else if (selectedMode === 'real') {
      setDataStore(getMockDataStore());
    }
  };

  const seedDemoData = async (store: DataStore) => {
    const templates = [
      {
        id: 'tmpl-1',
        owner_id: ownerId,
        name: 'Welcome Message',
        content: 'Hi {{name}}! Welcome to our community. We are excited to have you here!',
        variables: ['name'],
        created_at: new Date().toISOString()
      },
      {
        id: 'tmpl-2',
        owner_id: ownerId,
        name: 'Product Launch',
        content: 'New product alert! Check out {{product}} - now available at {{discount}}% off!',
        variables: ['product', 'discount'],
        created_at: new Date().toISOString()
      },
      {
        id: 'tmpl-3',
        owner_id: ownerId,
        name: 'Event Reminder',
        content: 'Reminder: {{event}} starts on {{date}}. Don\'t miss it!',
        variables: ['event', 'date'],
        created_at: new Date().toISOString()
      }
    ];

    const destinations = [
      {
        id: 'dest-1',
        owner_id: ownerId,
        chat_id: '-1001234567890',
        title: 'Product Updates',
        type: 'channel' as const,
        member_count: 1250,
        created_at: new Date().toISOString()
      },
      {
        id: 'dest-2',
        owner_id: ownerId,
        chat_id: '-1009876543210',
        title: 'Community Discussion',
        type: 'group' as const,
        member_count: 450,
        created_at: new Date().toISOString()
      },
      {
        id: 'dest-3',
        owner_id: ownerId,
        chat_id: '-1001122334455',
        title: 'VIP Announcements',
        type: 'channel' as const,
        member_count: 890,
        created_at: new Date().toISOString()
      },
      {
        id: 'dest-4',
        owner_id: ownerId,
        chat_id: '-1005544332211',
        title: 'Events & Meetups',
        type: 'group' as const,
        member_count: 320,
        created_at: new Date().toISOString()
      }
    ];

    for (const template of templates) {
      await store.createTemplate(template);
    }

    for (const destination of destinations) {
      await store.createDestination(destination);
    }
  };

  const handleModeSelect = async (selectedMode: 'demo' | 'real') => {
    telegram.impact('medium');
    setMode(selectedMode);
    localStorage.setItem('tg-marketer-mode', selectedMode);
    await initializeDataStore(selectedMode);
    setCurrentPage('destinations');
  };

  const handleLogout = () => {
    telegram.impact('light');
    setMode(null);
    setCurrentPage('lobby');
    setDataStore(null);
    localStorage.removeItem('tg-marketer-mode');
  };

  const navigateTo = (page: Page) => {
    telegram.impact('light');
    setCurrentPage(page);
  };

  if (currentPage === 'lobby' || !mode || !dataStore) {
    return <Lobby onModeSelect={handleModeSelect} />;
  }

  const mainPages: Page[] = ['destinations', 'compose', 'campaigns', 'settings'];
  const showBottomNav = mainPages.includes(currentPage);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: theme.bg_color,
        color: theme.text_color
      }}
    >
      {mode && <ModeBadge mode={mode} />}

      <div className="flex-1 pb-20">
        {currentPage === 'destinations' && (
          <Destinations
            onCompose={() => navigateTo('compose')}
            dataStore={dataStore}
            ownerId={ownerId}
          />
        )}

        {currentPage === 'compose' && (
          <Compose
            onBack={() => navigateTo('destinations')}
            dataStore={dataStore}
            ownerId={ownerId}
          />
        )}

        {currentPage === 'campaigns' && (
          <Campaigns
            onCompose={() => navigateTo('compose')}
            dataStore={dataStore}
            ownerId={ownerId}
          />
        )}

        {currentPage === 'accounts' && (
          <Accounts
            onBack={() => navigateTo('destinations')}
            mode={mode}
          />
        )}

        {currentPage === 'settings' && (
          <Settings
            mode={mode}
            onSwitchMode={handleLogout}
            onManageAccounts={() => navigateTo('accounts')}
          />
        )}
      </div>

      {showBottomNav && (
        <div
          className="fixed bottom-0 left-0 right-0 border-t flex justify-around items-center h-16"
          style={{
            backgroundColor: theme.bg_color,
            borderTopColor: theme.secondary_bg_color
          }}
        >
          <button
            onClick={() => navigateTo('destinations')}
            className="flex flex-col items-center justify-center flex-1 h-full"
            style={{
              color: currentPage === 'destinations' ? theme.button_color : theme.hint_color
            }}
          >
            <DestinationsIcon active={currentPage === 'destinations'} />
            <span className="text-xs mt-1">Contacts</span>
          </button>

          <button
            onClick={() => navigateTo('compose')}
            className="flex flex-col items-center justify-center flex-1 h-full"
            style={{
              color: currentPage === 'compose' ? theme.button_color : theme.hint_color
            }}
          >
            <ComposeIcon active={currentPage === 'compose'} />
            <span className="text-xs mt-1">Compose</span>
          </button>

          <button
            onClick={() => navigateTo('campaigns')}
            className="flex flex-col items-center justify-center flex-1 h-full"
            style={{
              color: currentPage === 'campaigns' ? theme.button_color : theme.hint_color
            }}
          >
            <CampaignsIcon active={currentPage === 'campaigns'} />
            <span className="text-xs mt-1">Campaigns</span>
          </button>

          <button
            onClick={() => navigateTo('settings')}
            className="flex flex-col items-center justify-center flex-1 h-full"
            style={{
              color: currentPage === 'settings' ? theme.button_color : theme.hint_color
            }}
          >
            <SettingsIcon active={currentPage === 'settings'} />
            <span className="text-xs mt-1">Settings</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
