import React, { useState, useEffect } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { SkeletonList } from '../components/Skeleton';
import { Button, Card, List, ListItem } from '../ui';
import { telegram } from '../lib/telegram';
import type { Campaign, CampaignStats, DataStore } from '../types';

interface CampaignsProps {
  onCompose: () => void;
  dataStore: DataStore;
  ownerId: string;
}

export function Campaigns({ onCompose, dataStore, ownerId }: CampaignsProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Record<string, CampaignStats>>({});
  const [loading, setLoading] = useState(true);
  
  useTelegramUI({
    title: 'Campaigns',
    mainButton: {
      text: 'New Campaign',
      onClick: onCompose
    }
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const campaignsData = await dataStore.getCampaigns(ownerId);
      setCampaigns(campaignsData);
      
      // Load stats for each campaign
      const statsPromises = campaignsData.map(async (campaign) => {
        try {
          const campaignStats = await dataStore.getCampaignStats(campaign.id);
          return { id: campaign.id, stats: campaignStats };
        } catch (error) {
          console.error(`Failed to load stats for campaign ${campaign.id}:`, error);
          return { id: campaign.id, stats: { total: 0, sent: 0, failed: 0, pending: 0 } };
        }
      });
      
      const statsResults = await Promise.all(statsPromises);
      const statsMap = statsResults.reduce((acc, { id, stats }) => {
        acc[id] = stats;
        return acc;
      }, {} as Record<string, CampaignStats>);
      
      setStats(statsMap);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusEmoji = (status: Campaign['status']) => {
    switch (status) {
      case 'running': return '▶️';
      case 'done': return '✅';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'running': return '#34c759';
      case 'done': return '#34c759';
      case 'failed': return '#ff3b30';
      default: return telegram.getTheme().hint_color;
    }
  };

  const formatStats = (campaignStats: CampaignStats) => {
    if (campaignStats.total === 0) return 'No messages';
    return `${campaignStats.sent}/${campaignStats.total} sent`;
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center mb-6">
          <div className="h-8 w-32 mx-auto mb-2 rounded animate-pulse bg-gray-200" />
          <div className="h-4 w-48 mx-auto rounded animate-pulse bg-gray-200" />
        </div>
        <SkeletonList count={3} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 text-center p-4 pb-2">
        <h1 
          className="text-2xl font-bold mb-1"
          style={{ color: telegram.getTheme().text_color }}
        >
          Campaigns
        </h1>
        <p className="text-sm" style={{ color: telegram.getTheme().hint_color }}>
          Track your message campaigns
        </p>
      </div>

      <div className="flex-1 flex flex-col px-4">
      {/* Campaigns List */}
        {campaigns.length > 0 ? (
        <List>
          {campaigns.map((campaign) => {
            const campaignStats = stats[campaign.id] || { total: 0, sent: 0, failed: 0, pending: 0 };
            
            return (
              <ListItem
                key={campaign.id}
                subtitle={`${campaign.status} • ${formatStats(campaignStats)}`}
                rightElement={
                  <div className="flex items-center space-x-2">
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ 
                        backgroundColor: getStatusColor(campaign.status) + '20',
                        color: getStatusColor(campaign.status)
                      }}
                    >
                      {campaign.status}
                    </span>
                    <span className="text-base">{getStatusEmoji(campaign.status)}</span>
                  </div>
                }
              >
                Campaign #{campaign.id.slice(-6)}
              </ListItem>
            );
          })}
        </List>
      ) : (
          <div className="flex-1 flex items-center justify-center">
            <Card variant="elevated" className="max-w-sm mx-auto">
          <div className="text-center py-6">
            <div className="text-3xl mb-3">
              📊
            </div>
            <h3 
              className="text-base font-semibold mb-2"
              style={{ color: telegram.getTheme().text_color }}
            >
              No campaigns yet
            </h3>
            <p 
              className="text-sm mb-4 leading-relaxed"
              style={{ color: telegram.getTheme().hint_color }}
            >
              Create your first campaign to get started
            </p>
            <Button variant="primary" size="small" onClick={onCompose}>
              Create Campaign
            </Button>
          </div>
        </Card>
            </div>
      )}
      </div>
    </div>
  );
}