import { useState } from 'react';
import { Layout, Typography, Button, Card, Flex, Space, Tag, Empty, Spin, Divider, Select } from 'antd';
import { CheckCircleOutlined, LoadingOutlined, LinkOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpotify, faAmazon, faApple, faDeezer } from '@fortawesome/free-brands-svg-icons';

const { Content } = Layout;
const { Title, Text } = Typography;

interface ThirdPartyPlaylist {
  id: string;
  name: string;
  trackCount: number;
  imageUrl?: string;
}

export function CreateShareList() {
  const [selectedService, setSelectedService] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [playlists, setPlaylists] = useState<ThirdPartyPlaylist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');

  const services = [
    { value: 'spotify', label: 'Spotify', icon: faSpotify, color: '#1DB954' },
    { value: 'amazon', label: 'Amazon Music', icon: faAmazon, color: '#FF9900' },
    { value: 'apple', label: 'Apple Music', icon: faApple, color: '#FA243C' },
    { value: 'deezer', label: 'Deezer', icon: faDeezer, color: '#FF0092' },
  ];

  const mockPlaylists: { [key: string]: ThirdPartyPlaylist[] } = {
    spotify: [
      { id: 'sp1', name: 'Chill Vibes', trackCount: 42 },
      { id: 'sp2', name: 'Workout Mix', trackCount: 38 },
      { id: 'sp3', name: 'Road Trip Classics', trackCount: 67 },
      { id: 'sp4', name: 'Focus Flow', trackCount: 29 },
    ],
    amazon: [
      { id: 'am1', name: 'My Favorites', trackCount: 156 },
      { id: 'am2', name: 'Party Hits', trackCount: 84 },
      { id: 'am3', name: 'Relaxation Station', trackCount: 45 },
    ],
    apple: [
      { id: 'ap1', name: 'Discovery Weekly', trackCount: 50 },
      { id: 'ap2', name: 'Summer 2026', trackCount: 73 },
      { id: 'ap3', name: 'Late Night Jazz', trackCount: 31 },
    ],
    deezer: [
      { id: 'dz1', name: 'Indie Discoveries', trackCount: 91 },
      { id: 'dz2', name: 'Electronic Dreams', trackCount: 62 },
    ],
  };

  const selectedServiceData = services.find(s => s.value === selectedService);

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setIsLoadingPlaylists(true);

    try {
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));

      setIsAuthenticated(true);

      // Load playlists
      await new Promise(resolve => setTimeout(resolve, 800));
      setPlaylists(mockPlaylists[selectedService] || []);
    } catch (error) {
      console.error('Authentication failed:', error);
    } finally {
      setIsAuthenticating(false);
      setIsLoadingPlaylists(false);
    }
  };

  const handleContinue = () => {
    const playlist = playlists.find(p => p.id === selectedPlaylist);
    if (playlist) {
      console.log('Creating ShareList with:', { selectedService, playlist });
      // Navigate to the ShareList or show success
    }
  };

  return (
    <Content style={{
      padding: '88px 24px 100px',
      width: '100%',
      maxWidth: '640px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          color: '#FFFFFF',
          boxShadow: '0 8px 24px rgba(56, 189, 248, 0.3)',
          margin: '0 auto 20px'
        }}>
          <LinkOutlined />
        </div>
        <Title
          level={1}
          style={{
            color: '#F1F5F9',
            margin: 0,
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '-0.5px',
            marginBottom: '8px'
          }}
        >
          Link Your Playlist
        </Title>
        <Text style={{ color: '#94A3B8', fontSize: '15px' }}>
          Connect a playlist from your music service to get started
        </Text>
      </div>

      {/* Main Card */}
      <Card
        style={{
          background: 'rgba(28, 31, 33, 0.4)',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          borderRadius: '16px',
          backdropFilter: 'blur(20px)'
        }}
        styles={{ body: { padding: '32px' } }}
      >
        {/* Step 1: Select Service */}
        <div style={{ marginBottom: '24px' }}>
          <Text style={{
            color: '#F1F5F9',
            display: 'block',
            marginBottom: '12px',
            fontSize: '13px',
            fontWeight: 600
          }}>
            Select Music Service
          </Text>
          <Select
            value={selectedService}
            onChange={(value) => {
              setSelectedService(value);
              setIsAuthenticated(false);
              setPlaylists([]);
              setSelectedPlaylist('');
            }}
            placeholder="Choose your music service"
            disabled={isAuthenticated}
            style={{ width: '100%' }}
            size="large"
            options={services.map(service => ({
              value: service.value,
              label: (
                <Flex align="center" gap={10}>
                  <FontAwesomeIcon
                    icon={service.icon}
                    style={{ fontSize: '18px', color: service.color }}
                  />
                  <Text style={{ color: '#F1F5F9', fontSize: '14px', fontWeight: 500 }}>
                    {service.label}
                  </Text>
                </Flex>
              )
            }))}
          />
        </div>

        <Divider style={{ margin: '24px 0', borderColor: 'rgba(56, 189, 248, 0.1)' }} />

        {/* Step 2: Authenticate */}
        {selectedService && !isAuthenticated && (
          <div>
            <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
              <div>
                <Text style={{
                  color: '#F1F5F9',
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  Authentication Required
                </Text>
                <Text style={{ color: '#64748B', fontSize: '12px' }}>
                  Connect your {selectedServiceData?.label} account
                </Text>
              </div>
              <LockOutlined style={{ fontSize: '24px', color: '#64748B' }} />
            </Flex>
            <Button
              block
              size="large"
              loading={isAuthenticating}
              onClick={handleAuthenticate}
              icon={!isAuthenticating && <UnlockOutlined />}
              style={{
                background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                border: 'none',
                borderRadius: '10px',
                height: '48px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#FFFFFF',
                boxShadow: '0 4px 16px rgba(56, 189, 248, 0.25)',
              }}
            >
              {isAuthenticating ? 'Authenticating...' : `Authenticate with ${selectedServiceData?.label}`}
            </Button>
          </div>
        )}

        {/* Step 3: Loading Playlists */}
        {isAuthenticated && isLoadingPlaylists && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" indicator={<LoadingOutlined style={{ fontSize: 36, color: '#38BDF8' }} />} />
            <Text style={{ display: 'block', marginTop: '16px', color: '#94A3B8', fontSize: '14px' }}>
              Loading your playlists...
            </Text>
          </div>
        )}

        {/* Step 4: Select Playlist */}
        {isAuthenticated && !isLoadingPlaylists && (
          <>
            <Flex align="center" gap={8} style={{ marginBottom: '16px' }}>
              <CheckCircleOutlined style={{ fontSize: '18px', color: '#4ADE80' }} />
              <Text style={{ color: '#4ADE80', fontSize: '13px', fontWeight: 600 }}>
                Connected to {selectedServiceData?.label}
              </Text>
            </Flex>

            <Text style={{
              color: '#F1F5F9',
              display: 'block',
              marginBottom: '12px',
              fontSize: '13px',
              fontWeight: 600
            }}>
              Select a Playlist
            </Text>

            {playlists.length === 0 ? (
              <Empty
                description={
                  <Text style={{ color: '#64748B', fontSize: '13px' }}>
                    No playlists found in your {selectedServiceData?.label} account
                  </Text>
                }
                style={{
                  padding: '40px 20px',
                  background: 'rgba(17, 19, 20, 0.5)',
                  borderRadius: '12px',
                  border: '1px solid rgba(56, 189, 248, 0.1)'
                }}
              />
            ) : (
              <div style={{
                maxHeight: '320px',
                overflowY: 'auto',
                background: 'rgba(17, 19, 20, 0.5)',
                borderRadius: '12px',
                border: '1px solid rgba(56, 189, 248, 0.15)',
                padding: '8px'
              }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      onClick={() => setSelectedPlaylist(playlist.id)}
                      style={{
                        padding: '14px 16px',
                        background: selectedPlaylist === playlist.id
                          ? 'rgba(56, 189, 248, 0.15)'
                          : 'rgba(28, 31, 33, 0.6)',
                        border: selectedPlaylist === playlist.id
                          ? '1px solid rgba(56, 189, 248, 0.4)'
                          : '1px solid rgba(56, 189, 248, 0.1)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPlaylist !== playlist.id) {
                          e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPlaylist !== playlist.id) {
                          e.currentTarget.style.background = 'rgba(28, 31, 33, 0.6)';
                        }
                      }}
                    >
                      <Flex justify="space-between" align="center">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{
                            color: '#F1F5F9',
                            fontSize: '14px',
                            fontWeight: 600,
                            display: 'block',
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {playlist.name}
                          </Text>
                          <Text style={{ color: '#64748B', fontSize: '12px' }}>
                            {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'}
                          </Text>
                        </div>
                        {selectedPlaylist === playlist.id && (
                          <CheckCircleOutlined style={{ fontSize: '20px', color: '#38BDF8', marginLeft: '12px' }} />
                        )}
                      </Flex>
                    </div>
                  ))}
                </Space>
              </div>
            )}

            {/* Continue Button */}
            {selectedPlaylist && (
              <Button
                block
                size="large"
                onClick={handleContinue}
                icon={<CheckCircleOutlined />}
                style={{
                  background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  height: '48px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  boxShadow: '0 4px 16px rgba(56, 189, 248, 0.25)',
                  marginTop: '20px'
                }}
              >
                Continue with "{playlists.find(p => p.id === selectedPlaylist)?.name}"
              </Button>
            )}
          </>
        )}
      </Card>
    </Content>
  );
}
