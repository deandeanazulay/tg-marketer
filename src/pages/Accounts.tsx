import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { Toast } from '../components/Toast';
import { SkeletonList } from '../components/Skeleton';
import { Button, Card, Input, List, ListItem } from '../ui';
import { portableApi } from '../lib/portableApi';

// Inline SVG icons
const PhoneIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const UserIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const SendIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22,2 15,22 11,13 2,9"/>
  </svg>
);

const PlusIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const TrashIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

type Account = { 
  id: number; 
  phone: string; 
  label?: string; 
  status: 'pending' | 'active' | 'locked'; 
  hourly_sent?: number; 
  daily_sent?: number; 
  last_seen?: string;
  created_at?: string;
};

interface AccountsProps {
  onBack: () => void;
}

export const Accounts: React.FC<AccountsProps> = ({ onBack }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  
  // Quick Send state
  const [showQuickSend, setShowQuickSend] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [chatId, setChatId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [lastJobId, setLastJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('');

  const theme = telegram.getTheme();

  useTelegramUI({
    title: 'Accounts',
    mainButton: !loading && accounts.length === 0 && !showAddForm ? {
      text: 'Add Account',
      onClick: () => {
        telegram.impact('medium');
        setShowAddForm(true);
      }
    } : undefined
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lastJobId && jobStatus !== 'done' && jobStatus !== 'failed') {
      interval = setInterval(pollJobStatus, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lastJobId, jobStatus]);

  const loadAccounts = async () => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    
    try {
      const data = jwt 
        ? await portableApi.accounts.list(jwt)
        : await portableApi.mock().accounts();
      
      if (!cancelled) {
        setAccounts(data);
      }
    } catch (e: any) {
      if (!cancelled) {
        setError(e?.message || 'Failed to load accounts');
        // Still show mock data on error
        setAccounts(await portableApi.mock().accounts());
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  const handleStartLogin = async () => {
    if (!phone.trim()) {
      Toast.error('Please enter a phone number');
      return;
    }

    try {
      setAddingAccount(true);
      telegram.impact('light');
      
      if (jwt) {
        const result = await portableApi.accounts.startLogin(jwt, phone);
        setPhoneCodeHash(result.phoneCodeHash);
        Toast.success('Code sent! Check your Telegram app');
      } else {
        // Mock mode
        setPhoneCodeHash('mock_hash');
        Toast.success('Mock: Code sent! Enter any 5 digits');
      }
    } catch (error) {
      console.error('Failed to start login:', error);
      Toast.error('Failed to send code');
    } finally {
      setAddingAccount(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      Toast.error('Please enter the verification code');
      return;
    }

    try {
      setVerifyingCode(true);
      telegram.impact('medium');
      
      if (jwt) {
        await portableApi.accounts.verifyCode(jwt, phone, code, phoneCodeHash);
      } else {
        // Mock verification - just simulate success
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      Toast.success('Account added successfully!');
      setShowAddForm(false);
      setPhone('');
      setCode('');
      setPhoneCodeHash('');
      await loadAccounts();
    } catch (error) {
      console.error('Failed to verify code:', error);
      Toast.error('Invalid code or expired');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleRemoveAccount = async (accountId: number) => {
    const confirmed = await telegram.showConfirm('Remove this account? This action cannot be undone.');
    if (!confirmed) return;

    try {
      telegram.impact('heavy');
      if (jwt) {
        await portableApi.accounts.remove(jwt, accountId);
      }
      Toast.success('Account removed');
      await loadAccounts();
    } catch (error) {
      console.error('Failed to remove account:', error);
      Toast.error('Failed to remove account');
    }
  };

  const handleQuickSend = async () => {
    if (!selectedAccountId || !chatId.trim() || !message.trim()) {
      Toast.error('Please fill all fields');
      return;
    }

    setSending(true);
    setJobStatus('Sending...');
    telegram.impact('light');
    
    try {
      if (jwt) {
        const result = await portableApi.jobs.enqueue(jwt, {
          type: 'send',
          account_id: selectedAccountId,
          payload: {
            chatId: chatId,
            text: message
          }
        });
        
        setLastJobId(result.id);
        setJobStatus('queued');
        Toast.success(`Job queued: #${result.id}`);
      } else {
        // Mock send
        await new Promise(resolve => setTimeout(resolve, 1000));
        setJobStatus('Mock sent ✔');
        Toast.success('Mock message sent!');
      }
      
      // Clear form
      setChatId('');
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      Toast.error('Failed to queue message');
      setJobStatus('Failed');
    } finally {
      setSending(false);
    }
  };

  const pollJobStatus = async () => {
    if (!lastJobId || !jwt) return;
    
    try {
      const job = await portableApi.jobs.get(jwt, lastJobId);
      setJobStatus(job.status);
      
      if (job.status === 'done') {
        Toast.success('Message sent successfully!');
      } else if (job.status === 'failed') {
        Toast.error('Message failed to send');
      }
    } catch (error) {
      console.error('Failed to poll job status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34c759';
      case 'locked': return '#ff3b30';
      default: return theme.hint_color;
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'active': return '✅';
      case 'locked': return '🔒';
      default: return '⏳';
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="flex-1 flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="flex-shrink-0 text-center mb-6">
        <div 
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: theme.button_color }}
        >
          <UserIcon className="w-8 h-8 text-white" />
        </div>
        <h1 
          className="text-2xl font-bold mb-2"
          style={{ color: theme.text_color }}
        >
          Telegram Accounts
        </h1>
        <p style={{ color: theme.hint_color }}>
          Manage your MTProto sessions for mass operations
        </p>
        {!jwt && (
          <div 
            className="inline-block px-3 py-1 rounded-full text-xs font-medium mt-2"
            style={{ 
              backgroundColor: '#34c759' + '20',
              color: '#34c759'
            }}
          >
            Demo Mode - Mock data shown
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="text-center">
            <div 
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
              style={{ borderColor: theme.button_color }}
            />
            <p style={{ color: theme.hint_color }}>Loading accounts...</p>
          </div>
          <SkeletonList count={3} />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="flex-shrink-0">
          <div className="text-center py-4">
            <div className="text-2xl mb-2">⚠️</div>
            <p 
              className="font-medium mb-2"
              style={{ color: '#ff3b30' }}
            >
              {error}
            </p>
            <p 
              className="text-sm"
              style={{ color: theme.hint_color }}
            >
              Showing demo data instead
            </p>
          </div>
        </Card>
      )}

      {/* Add Account Form */}
      {!loading && showAddForm && (
        <Card className="flex-shrink-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 
                className="text-lg font-semibold"
                style={{ color: theme.text_color }}
              >
                Add Telegram Account
              </h3>
              <button
                onClick={() => {
                  telegram.impact('light');
                  setShowAddForm(false);
                  setPhoneCodeHash('');
                  setCode('');
                  setPhone('');
                }}
                className="text-sm px-3 py-1 rounded-full"
                style={{ 
                  color: theme.hint_color,
                  backgroundColor: theme.secondary_bg_color
                }}
              >
                Cancel
              </button>
            </div>
            
            {!phoneCodeHash ? (
              <div className="space-y-4">
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: theme.text_color }}
                  >
                    Phone Number
                  </label>
                  <Input
                    value={phone}
                    onChange={setPhone}
                    placeholder="+1234567890"
                    disabled={addingAccount}
                  />
                  <p 
                    className="text-xs mt-1"
                    style={{ color: theme.hint_color }}
                  >
                    Enter your phone number with country code
                  </p>
                </div>
                <Button 
                  variant="primary" 
                  onClick={handleStartLogin}
                  disabled={addingAccount || !phone.trim()}
                  className="w-full"
                >
                  {addingAccount ? 'Sending Code...' : 'Send Verification Code'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">📱</div>
                  <p 
                    className="font-medium mb-1"
                    style={{ color: theme.text_color }}
                  >
                    Code sent to {phone}
                  </p>
                  <p 
                    className="text-sm"
                    style={{ color: theme.hint_color }}
                  >
                    {jwt ? 'Check your Telegram app for the verification code' : 'Demo: enter any 5 digits'}
                  </p>
                </div>
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: theme.text_color }}
                  >
                    Verification Code
                  </label>
                  <Input
                    value={code}
                    onChange={setCode}
                    placeholder="12345"
                    disabled={verifyingCode}
                  />
                </div>
                <Button 
                  variant="primary" 
                  onClick={handleVerifyCode}
                  disabled={verifyingCode || !code.trim()}
                  className="w-full"
                >
                  {verifyingCode ? 'Verifying...' : 'Verify & Add Account'}
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Quick Send */}
      {!loading && accounts.length > 0 && (
        <Card className="flex-shrink-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SendIcon style={{ color: theme.button_color }} />
                <h3 
                  className="font-semibold"
                  style={{ color: theme.text_color }}
                >
                  Quick Send
                </h3>
              </div>
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  telegram.impact('light');
                  setShowQuickSend(!showQuickSend);
                }}
              >
                {showQuickSend ? 'Hide' : 'Show'}
              </Button>
            </div>
            
            {showQuickSend && (
              <div className="space-y-4">
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: theme.text_color }}
                  >
                    Account
                  </label>
                  <select
                    value={selectedAccountId || ''}
                    onChange={(e) => setSelectedAccountId(Number(e.target.value) || null)}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: theme.secondary_bg_color,
                      color: theme.text_color,
                      borderColor: theme.hint_color + '40'
                    }}
                  >
                    <option value="">Select Account</option>
                    {accounts.filter(a => a.status === 'active').map(account => (
                      <option key={account.id} value={account.id}>
                        {account.label || account.phone} ({account.hourly_sent || 0}/h sent)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: theme.text_color }}
                  >
                    Chat ID
                  </label>
                  <Input
                    value={chatId}
                    onChange={setChatId}
                    placeholder="e.g., -1001234567890"
                    disabled={sending}
                  />
                  <p 
                    className="text-xs mt-1"
                    style={{ color: theme.hint_color }}
                  >
                    Channel or group chat ID (negative number)
                  </p>
                </div>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: theme.text_color }}
                  >
                    Message
                  </label>
                  <Input
                    type="textarea"
                    value={message}
                    onChange={setMessage}
                    placeholder="Type your message here..."
                    disabled={sending}
                    rows={3}
                  />
                </div>
                
                <Button 
                  variant="primary" 
                  onClick={handleQuickSend}
                  disabled={sending || !selectedAccountId || !chatId || !message}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <SendIcon />
                  <span>{sending ? 'Sending...' : 'Send Message'}</span>
                </Button>
                
                {jobStatus && (
                  <div 
                    className="text-sm p-3 rounded-lg"
                    style={{ 
                      backgroundColor: theme.secondary_bg_color,
                      color: theme.text_color 
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="text-lg">
                        {jobStatus.includes('sent') || jobStatus === 'done' ? '✅' : 
                         jobStatus.includes('failed') || jobStatus === 'Failed' ? '❌' : '⏳'}
                      </div>
                      <div>
                        <div className="font-medium">Status: {jobStatus}</div>
                        {lastJobId && (
                          <div 
                            className="text-xs"
                            style={{ color: theme.hint_color }}
                          >
                            Job #{lastJobId}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Accounts List */}
      {!loading && accounts.length > 0 && (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <span 
              className="text-sm font-medium"
              style={{ color: theme.text_color }}
            >
              {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </span>
            <Button 
              variant="secondary" 
              size="small"
              onClick={() => {
                telegram.impact('light');
                setShowAddForm(true);
              }}
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add More
            </Button>
          </div>
          
          <List>
            {accounts.map((account) => (
              <ListItem
                key={account.id}
                subtitle={
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs">
                      <span 
                        className="px-2 py-0.5 rounded-full font-medium"
                        style={{ 
                          backgroundColor: getStatusColor(account.status) + '20',
                          color: getStatusColor(account.status)
                        }}
                      >
                        {account.status}
                      </span>
                      <span style={{ color: theme.hint_color }}>
                        {account.hourly_sent || 0}/h • {account.daily_sent || 0}/d sent
                      </span>
                    </div>
                    <div 
                      className="text-xs"
                      style={{ color: theme.hint_color }}
                    >
                      Last seen: {formatLastSeen(account.last_seen)}
                    </div>
                  </div>
                }
                rightElement={
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getStatusEmoji(account.status)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAccount(account.id);
                      }}
                      className="p-1 rounded-full transition-colors"
                      style={{ 
                        color: '#ff3b30',
                        backgroundColor: '#ff3b30' + '10'
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                }
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: theme.button_color + '20' }}
                  >
                    <PhoneIcon style={{ color: theme.button_color }} />
                  </div>
                  <div>
                    <div 
                      className="font-medium"
                      style={{ color: theme.text_color }}
                    >
                      {account.label || 'Telegram Account'}
                    </div>
                    <div 
                      className="text-sm"
                      style={{ color: theme.hint_color }}
                    >
                      {account.phone}
                    </div>
                  </div>
                </div>
              </ListItem>
            ))}
          </List>
        </div>
      )}

      {/* Empty State */}
      {!loading && accounts.length === 0 && !showAddForm && (
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-sm mx-auto">
            <div className="text-center py-12">
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: theme.button_color + '20' }}
            >
              <PhoneIcon 
                className="w-8 h-8"
                style={{ color: theme.button_color }} 
              />
            </div>
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: theme.text_color }}
            >
              No accounts yet
            </h3>
            <p 
              className="text-sm mb-6 max-w-sm mx-auto"
              style={{ color: theme.hint_color }}
            >
              Add your first Telegram account to start sending messages at scale
              {!jwt && '. Demo mode is available for testing.'}
            </p>
            <Button 
              variant="primary" 
              onClick={() => {
                telegram.impact('medium');
                setShowAddForm(true);
              }}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add Your First Account</span>
            </Button>
          </div>
          </Card>
        </div>
      )}
      </div>
  );
};

// Export both named and default to prevent import mismatch
export default Accounts;