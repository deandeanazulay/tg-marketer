import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { Toast } from '../components/Toast';
import { SkeletonList } from '../components/Skeleton';
import { Button, Card, Input, List, ListItem } from '../ui';
import type { Template, Destination, DataStore } from '../types';

interface ComposeProps {
  onBack: () => void;
  dataStore: DataStore;
  ownerId: string;
}

export function Compose({ onBack, dataStore, ownerId }: ComposeProps) {
  const [step, setStep] = useState<'template' | 'edit' | 'preview'>('template');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  useTelegramUI({
    title: 'Compose Message',
    backButton: { onClick: onBack },
    mainButton: getMainButtonConfig()
  });

  function getMainButtonConfig() {
    switch (step) {
      case 'template':
        return selectedTemplate ? {
          text: 'Continue',
          onClick: () => setStep('edit')
        } : undefined;
      case 'edit':
        return {
          text: 'Preview',
          onClick: () => setStep('preview')
        };
      case 'preview':
        return selectedDestinations.length > 0 ? {
          text: 'Send Message',
          onClick: handleSend,
          loading: sending
        } : undefined;
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesData, destinationsData] = await Promise.all([
        dataStore.getTemplates(ownerId),
        dataStore.getDestinations(ownerId)
      ]);
      setTemplates(templatesData);
      setDestinations(destinationsData.filter(d => d.can_send));
    } catch (error) {
      console.error('Failed to load data:', error);
      Toast.error('Failed to load data');
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate || selectedDestinations.length === 0) return;

    setSending(true);
    try {
      // Create a campaign and send messages
      const campaign = await dataStore.createCampaign({
        owner_id: ownerId,
        template_id: selectedTemplate.id,
        status: 'running'
      });
      
      // Create campaign items for each destination
      const campaignItems = selectedDestinations.map(destId => ({
        campaign_id: campaign.id,
        destination_id: destId,
        status: 'pending' as const
      }));
      await dataStore.createCampaignItems(campaignItems);
      
      Toast.success('Message sent successfully!');
      onBack();
    } catch (error) {
      console.error('Failed to send message:', error);
      Toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderPreview = () => {
    if (!selectedTemplate) return '';
    
    let content = selectedTemplate.content;
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return content;
  };

  const handleTemplateSelect = (template: Template) => {
    telegram.impact('light');
    setSelectedTemplate(template);
  };

  const handleDestinationToggle = (destinationId: string) => {
    telegram.impact('light');
    setSelectedDestinations(prev => 
      prev.includes(destinationId)
        ? prev.filter(id => id !== destinationId)
        : [...prev, destinationId]
    );
  };

  return (
    <div className="flex-1 flex flex-col p-4 space-y-4">
      {/* Progress indicator */}
      <div className="flex-shrink-0 flex items-center justify-center space-x-2 mb-6">
        {['template', 'edit', 'preview'].map((s, i) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-colors ${
              step === s ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
      {/* Template Selection */}
      {step === 'template' && (
        <div className="flex-1 flex flex-col space-y-4">
          {templates.length === 0 ? (
            <SkeletonList count={3} />
          ) : (
          <List>
            {templates.map((template) => (
              <ListItem
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                subtitle={template.content.substring(0, 50) + '...'}
                rightElement={
                  selectedTemplate?.id === template.id ? (
                    <div 
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: '#0088cc' }}
                    />
                  ) : (
                    <div 
                      className="w-5 h-5 rounded-full border-2"
                      style={{ borderColor: '#ccc' }}
                    />
                  )
                }
              >
                {template.name}
              </ListItem>
            ))}
          </List>
          )}
        </div>
      )}

      {/* Variable Editing */}
      {step === 'edit' && selectedTemplate && (
        <div className="flex-1 flex flex-col space-y-4">
          {Object.keys(selectedTemplate.variables).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(selectedTemplate.variables).map(([key, defaultValue]) => (
                <div key={key}>
                  <label 
                    className="block text-sm font-medium mb-1"
                  >
                    {key}
                  </label>
                  <Input
                    value={variables[key] || defaultValue || ''}
                    onChange={(value) => setVariables(prev => ({ ...prev, [key]: value }))}
                    placeholder={`Enter ${key}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-gray-500">
                This template has no variables to edit.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Preview and Send */}
      {step === 'preview' && selectedTemplate && (
        <div className="flex-1 flex flex-col space-y-4">
          <Card>
            <div className="whitespace-pre-wrap text-gray-900">
              {renderPreview()}
            </div>
          </Card>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Select destinations ({selectedDestinations.length} selected)
            </p>
            <List>
              {destinations.map((destination) => (
                <ListItem
                  key={destination.id}
                  onClick={() => handleDestinationToggle(destination.id)}
                  subtitle={destination.type}
                  rightElement={
                    selectedDestinations.includes(destination.id) ? (
                      <div 
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: '#0088cc' }}
                      />
                    ) : (
                      <div 
                        className="w-5 h-5 rounded-full border-2"
                        style={{ borderColor: '#ccc' }}
                      />
                    )
                  }
                >
                  {destination.title}
                </ListItem>
              ))}
            </List>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}