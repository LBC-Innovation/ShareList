import { useState } from 'react';
import { Modal, Select, Button, Typography, Flex, Space, Divider, Spin, Empty } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpotify, faAmazon, faApple, faDeezer } from '@fortawesome/free-brands-svg-icons';
import { CheckCircleOutlined, LoadingOutlined, LinkOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface ThirdPartyPlaylist {
  id: string;
  name: string;
  trackCount: number;
  imageUrl?: string;
}

interface LinkPlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onLink: (service: string, playlistId: string, playlistName: string) => void;
}

export function LinkPlaylistModal({ visible, onClose, onLink }: LinkPlaylistModalProps) {
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

  const handleLink = () => {
    const playlist = playlists.find(p => p.id === selectedPlaylist);
    if (playlist) {
      onLink(selectedService, playlist.id, playlist.name);
      handleReset();
    }
  };

  const handleReset = () => {
    setSelectedService('');
    setIsAuthenticated(false);
    setIsAuthenticating(false);
    setPlaylists([]);
    setSelectedPlaylist('');
    setIsLoadingPlaylists(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const selectedServiceData = services.find(s => s.value === selectedService);

  return (
    <Modal
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={560}
      centered
      closeIcon={null}
      styles={{
        content: {
          background: 'rgba(17, 19, 20, 0.98)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          borderRadius: '16px',
          padding: 0,
          overflow: 'hidden'
        },
        body: {
          padding: 0,
          margin: 0,
        },
        mask: {
          backdropFilter: 'blur(3px)',
          background: 'rgba(0, 0, 0, 0.4)'
        },
      }}
    >
      {/* Header */}
      <div style={{
        padding: '28px 32px',
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(74, 222, 128, 0.1) 100%)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
      }}>
        <Flex align="center" gap={12}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)'
          }}>
            <LinkOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: '#F1F5F9', fontSize: '19px', fontWeight: 700 }}>
              Link Playlist
            </Title>
            <Text style={{ color: '#94A3B8', fontSize: '13px' }}>
              Connect a playlist from your music service
            </Text>
          </div>
        </Flex>
      </div>

      {/* Body */}
      <div style={{ padding: '28px 32px' }}>
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
                maxHeight: '280px',
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
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px 32px',
        borderTop: '1px solid rgba(56, 189, 248, 0.1)',
        background: 'rgba(17, 19, 20, 0.5)'
      }}>
        <Flex gap={12} justify="flex-end">
          <Button
            size="large"
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              color: '#94A3B8',
              borderRadius: '10px',
              height: '44px',
              padding: '0 20px',
              fontWeight: 600
            }}
          >
            Cancel
          </Button>
          <Button
            size="large"
            onClick={handleLink}
            disabled={!selectedPlaylist}
            icon={<LinkOutlined />}
            style={{
              background: selectedPlaylist
                ? 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)'
                : 'rgba(56, 189, 248, 0.1)',
              border: 'none',
              borderRadius: '10px',
              height: '44px',
              padding: '0 24px',
              fontSize: '14px',
              fontWeight: 700,
              color: selectedPlaylist ? '#FFFFFF' : '#64748B',
              boxShadow: selectedPlaylist ? '0 4px 16px rgba(56, 189, 248, 0.25)' : 'none',
              cursor: selectedPlaylist ? 'pointer' : 'not-allowed',
              opacity: selectedPlaylist ? 1 : 0.5
            }}
          >
            Link Playlist
          </Button>
        </Flex>
      </div>
    </Modal>
  );
}
