import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { useSkeleton } from '../hooks/useSkeleton';
import { Toast } from '../components/Toast';
import { SkeletonList } from '../components/Skeleton';
import { Button, Card, List, ListItem } from '../ui';
import type { Destination, DataStore } from '../types';
import { LIMITS } from '../utils/constants';

// Inline SVG icons to avoid icon pack dependency
const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const HashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="9" x2="20" y2="9"></line>
    <line x1="4" y1="15" x2="20" y2="15"></line>
    <line x1="10" y1="3" x2="8" y2="21"></line>
    <line x1="16" y1="3" x2="14" y2="21"></line>
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

interface DestinationsProps {
  dataStore: DataStore;
  ownerId: string;
  mode: 'demo' | 'real';
}

export function Destinations({ dataStore, ownerId, mode }: DestinationsProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const showSkeleton = useSkeleton(100);

  useTelegramUI({
    title: 'Destinations',
    mainButton: !loading && destinations.length === 0 ? {
      text: 'Add Bot to Channel',
      onClick: handleAddBot
    } : undefined
  });

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await dataStore.getDestinations(ownerId);
      setDestinations(data);
    } catch (error) {
      console.error('Failed to load destinations:', error);
      Toast.error('Failed to load destinations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    telegram.impact('light');
    setRefreshing(true);
    await loadDestinations(false);
  };

  const handleAddBot = () => {
    telegram.impact('medium');
    const botUsername = import.meta.env.VITE_BOT_USERNAME || 'your_bot';
    const addUrl = `https://t.me/${botUsername}?startgroup=true`;
    window.open(addUrl, '_blank');
  };

  const handleLoadDemoData = async () => {
    telegram.impact('medium');
    if (mode === 'demo') {
      // Reset demo data by calling resetDemoData if available
      if ('resetDemoData' in dataStore) {
        (dataStore as any).resetDemoData();
      }
      await loadDestinations(false);
    }
  };

  const theme = telegram.getTheme();

  if (loading && showSkeleton) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center mb-6">
          <div 
            className="h-8 w-32 mx-auto mb-2 rounded animate-pulse"
            style={{ backgroundColor: theme.hint_color + '20' }}
          />
          <div 
            className="h-4 w-48 mx-auto rounded animate-pulse"
            style={{ backgroundColor: theme.hint_color + '20' }}
          />
        </div>
        <SkeletonList count={4} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 text-center p-4 pb-2">
        <h1 
          className="text-2xl font-bold mb-1"
          style={{ color: theme.text_color }}
        >
          Destinations
        </h1>
        <p className="text-sm" style={{ color: theme.hint_color }}>
          Groups and channels where you can send messages
        </p>
        {destinations.length > 0 && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="mt-2 text-xs px-3 py-1.5 rounded-full transition-all active:scale-95"
            style={{ 
              color: theme.button_color,
              backgroundColor: theme.button_color + '15'
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col px-4 space-y-3">
      {/* Empty State */}
      {destinations.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <Card variant="elevated" className="max-w-sm mx-auto">
            <div className="text-center py-6">
          <div 
            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ backgroundColor: theme.button_color + '20' }}
          >
            <PlusIcon 
              style={{ color: theme.button_color }}
            />
          </div>
          <h3 
            className="text-base font-semibold mb-2"
            style={{ color: theme.text_color }}
          >
            No destinations yet
          </h3>
          <p 
            className="text-sm mb-4 leading-relaxed"
            style={{ color: theme.hint_color }}
          >
            {mode === 'demo' 
              ? 'Load demo data to explore the interface, or add your bot to channels/groups'
              : 'Add your bot as admin to channels and groups to send messages'
            }
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {mode === 'demo' && (
              <Button 
                variant="secondary" 
                size="small"
                onClick={handleLoadDemoData}
              >
                Load Demo Data
              </Button>
            )}
          <Button 
            variant="primary" 
            size="small"
            onClick={handleAddBot}
          >
            Add Bot to Channel
          </Button>
        </div>
          </div>
          </Card>
        </div>
      )}

      {/* Destinations List */}
      {destinations.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-3">
            <span 
              className="text-sm font-medium"
              style={{ color: theme.text_color }}
            >
              {destinations.length} destination{destinations.length !== 1 ? 's' : ''}
            </span>
            <Button 
              variant="secondary" 
              size="small"
              onClick={handleAddBot}
            >
              Add More
            </Button>
          </div>
          <List>
          {destinations.map((destination) => (
            <ListItem
              key={destination.id}
              subtitle={`${destination.type} • ${destination.can_send ? 'Can send' : 'Cannot send'}`}
              rightElement={
                destination.type === 'channel' ? (
                  <HashIcon 
                    style={{ color: theme.hint_color }}
                  />
                ) : (
                  <UsersIcon 
                    style={{ color: theme.hint_color }}
                  />
                )
              }
            >
              {destination.title}
            </ListItem>
          ))}
          </List>
        </>
      )}
      </div>
    </div>
  );
}