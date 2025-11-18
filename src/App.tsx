import { useEffect, useState, useCallback } from 'react';
import { telegram } from './lib/telegram';
import { Lobby } from './pages/Lobby';
import { Accounts } from './pages/Accounts';
import { Campaigns } from './pages/Campaigns';
import { Compose } from './pages/Compose';
import { Destinations } from './pages/Destinations';
import { Settings } from './pages/Settings';
import { SessionManager } from './pages/SessionManager';
import { createClient } from '@supabase/supabase-js';
import { SupabaseDataStore } from './data/supabase';
import { getMockDataStore } from './data/mock';
import type { DataStore } from './types';

type Page = 'lobby' | 'destinations' | 'compose' | 'campaigns' | 'accounts' | 'settings' | 'sessions';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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
  const [currentPage, setCurrentPage] = useState<Page>('lobby');
  const [ready, setReady] = useState(false);
  const [ownerId, setOwnerId] = useState<string>('user');
  const [dataStore, setDataStore] = useState<DataStore | null>(null);
  const [mode, setMode] = useState<'demo' | 'real'>('demo');
  const theme = telegram.getTheme();

  useEffect(() => {
    const initApp = async () => {
      await telegram.init();
      const user = telegram.getUser();
      const userId = user ? user.id.toString() : 'demo_user';
      setOwnerId(userId);

      if (supabase) {
        const store = new SupabaseDataStore(supabase, userId);
        setDataStore(store);
        setMode('real');
      } else {
        const store = getMockDataStore(userId);
        setDataStore(store);
        setMode('demo');
      }
    };
    initApp();
  }, []);

  const handleReady = useCallback(() => {
    setReady(true);
    setCurrentPage('destinations');
  }, []);

  const navigateTo = (page: Page) => {
    telegram.impact('light');
    setCurrentPage(page);
  };

  if (!ready || !dataStore) {
    return <Lobby onReady={handleReady} />;
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
      <div className="flex-1 pb-20">
        {currentPage === 'destinations' && (
          <Destinations
            dataStore={dataStore}
            ownerId={ownerId}
            mode={mode}
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
          />
        )}

        {currentPage === 'settings' && (
          <Settings
            onManageAccounts={() => navigateTo('accounts')}
            onManageSessions={() => navigateTo('sessions')}
          />
        )}

        {currentPage === 'sessions' && (
          <SessionManager
            onBack={() => navigateTo('settings')}
            userId={ownerId}
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
