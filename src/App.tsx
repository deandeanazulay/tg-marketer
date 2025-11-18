import React, { useState, useEffect } from 'react';
import { telegram } from './lib/telegram';
import { Lobby } from './pages/Lobby'; // Keep Lobby for initial mode selection
import { ModeBadge } from './components/ModeBadge';
import { Destinations } from './pages/Destinations';
import { Compose } from './pages/Compose';
import { Campaigns } from './pages/Campaigns';
import { Accounts } from './pages/Accounts';
import { Settings } from './pages/Settings';
import { Toast } from './components/Toast';
import { MockStore } from './data/mock';

type Screen = 'lobby' | 'destinations' | 'compose' | 'campaigns' | 'accounts' | 'settings';
import { clientBootstrap, setUserModePreference } from './lib/bootstrap';
import { BootstrapConfig, DataStore } from './types';

// Navigation icons as inline SVGs
const NavIcons = {
  destinations: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  compose: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3h18v18h-18z"/>
      <path d="M21 9l-9 6-9-6"/>
    </svg>
  ),
  campaigns: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18"/>
      <path d="M18 17V9"/>
      <path d="M13 17V5"/>
      <path d="M8 17v-3"/>
    </svg>
  ),
  accounts: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  settings: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
    </svg>
  )
};

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('lobby');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<'demo' | 'real' | null>(null);
  const [bootstrapConfig, setBootstrapConfig] = useState<BootstrapConfig | null>(null);
  const [dataStore, setDataStore] = useState<DataStore | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we're in Telegram
      const isTelegram = await telegram.init();

      if (!isTelegram) {
        // Not in Telegram - show demo mode directly
        const defaultConfig: BootstrapConfig = {
          adapters: { data: 'mock' },
          features: { someFeature: true },
          ui: { brand: 'TG Marketer', accent: '#0088cc' },
          defaults: { mode: 'demo' }
        };
        
        setAppMode('demo');
        setTelegramId('demo_user');
        setBootstrapConfig(defaultConfig);
        setIsAuthenticated(true);
        
        const store = new MockStore(fetchedTelegramId || 'demo_user');
        setDataStore(store);
        
        setCurrentScreen('destinations');
        setLoading(false);
        return;
      }

      // Perform client-side bootstrap (verify initData, get config, user mode)
      const { cfg, jwt: fetchedJwt, mode, telegramId: fetchedTelegramId } = await clientBootstrap();
      
      setTelegramId(fetchedTelegramId);
      setJwt(fetchedJwt);
      setAppMode(mode);
      setBootstrapConfig(cfg);
      setIsAuthenticated(true);

      const store = new MockStore(fetchedTelegramId || 'demo_user');
      setDataStore(store);

      // If user has a saved preference, skip lobby and go directly to app
      if (mode) {
        setCurrentScreen('destinations');
      }
    } catch (error) {
      console.error('App initialization failed:', error);
      setError(error instanceof Error ? error.message : 'Initialization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSelect = async (mode: 'demo' | 'real') => {
    if (!telegramId) {
      Toast.error("Cannot select mode without a Telegram ID. Please restart the app in Telegram.");
      return;
    }
    try {
      setLoading(true);
      
      if (telegramId !== 'demo_user') {
        await setUserModePreference(telegramId, mode);
      }
      
      setAppMode(mode);
      
      // Re-initialize API service with new mode
      if (bootstrapConfig) {
        const store = new MockStore(fetchedTelegramId || 'demo_user');
        setDataStore(store);
      }
      
      setCurrentScreen('destinations');
    } catch (err) {
      console.error('Failed to set user mode:', err);
      Toast.error(err instanceof Error ? err.message : 'Failed to set user mode');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLobby = () => {
    setAppMode(null);
    setCurrentScreen('lobby');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setTelegramId(null);
    setCurrentScreen('lobby');
    setAppMode(null);
    localStorage.removeItem('telegram_jwt');
  };

  const theme = telegram.getTheme();

  // Apply theme to body
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = theme.bg_color;
      document.body.style.color = theme.text_color;
    }
  }, [theme]);

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg_color }}>
        <div className="text-center">
          <div 
            className="w-12 h-12 border-3 border-t-transparent rounded-full animate-spin mx-auto mb-6"
            style={{ borderColor: theme.button_color, borderTopColor: 'transparent' }}
          />
          <div 
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: theme.button_color }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: theme.text_color }}>
            TG Marketer
          </h2>
          <p className="text-sm" style={{ color: theme.hint_color }}>
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: theme.bg_color }}>
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-3" style={{ color: theme.text_color }}>
            Something went wrong
          </h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: theme.hint_color }}>
            {error}
          </p>
          <button 
            onClick={initializeApp}
            className="px-6 py-3 rounded-xl font-medium transition-all active:scale-95"
            style={{ 
              backgroundColor: theme.button_color,
              color: theme.button_text_color
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: theme.bg_color }}>
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-xl font-semibold mb-3" style={{ color: theme.text_color }}>
            Authentication Required
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: theme.hint_color }}>
            Please open this app through Telegram to continue
          </p>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div 
      className="h-screen flex flex-col bg-gray-50"
      style={{ backgroundColor: theme.bg_color }}
    >
      {/* Mode Badge - Fixed Position */}
      {appMode && currentScreen !== 'lobby' && (
        <div className="absolute top-2 right-2 z-50">
          <ModeBadge mode={appMode} />
        </div>
      )}

      {/* Lobby Screen - Full Height */}
      {currentScreen === 'lobby' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <Lobby onModeSelect={handleModeSelect} />
        </div>
      )}
      
      {/* Main App Layout */}
      {currentScreen !== 'lobby' && isAuthenticated && (
        <>
          {/* Main Content Area - Flex Grow */}
          <main className="flex-1 flex flex-col overflow-hidden bg-gray-50" style={{ backgroundColor: theme.secondary_bg_color || theme.bg_color }}>
            <div className="flex-1 overflow-auto scrollbar-hide">
              {currentScreen === 'destinations' && dataStore && (
                <Destinations 
                  dataStore={dataStore!} 
                  ownerId={telegramId!} 
                  mode={appMode!}
                />
              )}
              {currentScreen === 'compose' && dataStore && (
                <Compose 
                  onBack={() => setCurrentScreen('destinations')} 
                  dataStore={dataStore!} 
                  ownerId={telegramId!} 
                />
              )}
              {currentScreen === 'campaigns' && dataStore && (
                <Campaigns 
                  onCompose={() => setCurrentScreen('compose')} 
                  dataStore={dataStore!} 
                  ownerId={telegramId!} 
                />
              )}
              {currentScreen === 'accounts' && (
                <Accounts jwt={jwt} />
              )}
              {currentScreen === 'settings' && dataStore && (
                <Settings 
                  onLogout={handleLogout} 
                  onBackToLobby={handleBackToLobby} 
                  dataStore={dataStore!} 
                  ownerId={telegramId!} 
                  currentMode={appMode} 
                />
              )}
            </div>
          </main>

          {/* Bottom Navigation - Fixed to Bottom */}
          <nav 
            className="flex-shrink-0 border-t px-2 py-1 safe-area-inset-bottom backdrop-blur-md"
            style={{
              backgroundColor: theme.bg_color,
              borderColor: theme.hint_color + '20',
              boxShadow: '0 -1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <div className="flex justify-around items-center max-w-lg mx-auto w-full">
              {[
                { key: 'destinations', title: 'Chats', icon: NavIcons.destinations },
                { key: 'compose', title: 'Compose', icon: NavIcons.compose },
                { key: 'campaigns', title: 'Stats', icon: NavIcons.campaigns },
                { key: 'accounts', title: 'Accounts', icon: NavIcons.accounts },
                { key: 'settings', title: 'Settings', icon: NavIcons.settings }
              ].map(({ key, title, icon: Icon }) => {
                const isActive = currentScreen === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      telegram.impact('light');
                      setCurrentScreen(key as Screen);
                    }}
                    className="flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-all duration-150 min-w-0 flex-1 max-w-[70px] active:scale-95"
                    style={{
                      color: isActive ? theme.button_color : theme.hint_color,
                      backgroundColor: isActive ? theme.button_color + '10' : 'transparent'
                    }}
                  >
                    <div className="flex items-center justify-center mb-0.5">
                      <Icon />
                    </div>
                    <span className="text-xs font-medium truncate leading-none">
                      {title}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

export default App;