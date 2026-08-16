import { Layout, Skeleton, Card, Flex } from 'antd';
import { PlaylistHero } from './PlaylistHero';
import { SyncStatusBar } from './SyncStatusBar';
import { TrackList } from './TrackList';
import { LaunchStreamingFAB } from './LaunchStreamingFAB';
import { useState, useEffect } from 'react';

const { Content } = Layout;

export function PlaylistView() {
  const [isLoading, setIsLoading] = useState(true);

  // Album art images for the mosaic
  const albumImages = [
    'https://images.unsplash.com/photo-1644855640845-ab57a047320e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbGJ1bSUyMGNvdmVyJTIwbXVzaWMlMjBhcnR8ZW58MXx8fHwxNzc1NjcxMjEzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1703115015343-81b498a8c080?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljJTIwbXVzaWMlMjBhbGJ1bXxlbnwxfHx8fDE3NzU2NzEyMTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1618972677328-9cd129a74c14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpZSUyMHJvY2slMjBhbGJ1bXxlbnwxfHx8fDE3NzU2NzEyMTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1660087031197-f483b4388e91?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXAlMjBob3AlMjB2aW55bCUyMHJlY29yZHxlbnwxfHx8fDE3NzU2NzEyMTR8MA&ixlib=rb-4.1.0&q=80&w=1080',
  ];

  // Mock track data
  const tracks = [
    {
      id: 1,
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      duration: '3:20',
      albumArt: 'https://images.unsplash.com/photo-1644855640845-ab57a047320e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbGJ1bSUyMGNvdmVyJTIwbXVzaWMlMjBhcnR8ZW58MXx8fHwxNzc1NjcxMjEzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      isPlaying: true,
      platform: 'spotify' as const,
    },
    {
      id: 2,
      title: 'Electric Feel',
      artist: 'MGMT',
      duration: '3:49',
      albumArt: 'https://images.unsplash.com/photo-1703115015343-81b498a8c080?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljJTIwbXVzaWMlMjBhbGJ1bXxlbnwxfHx8fDE3NzU2NzEyMTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
      isNew: true,
      platform: 'amazon' as const,
    },
    {
      id: 3,
      title: 'Mr. Brightside',
      artist: 'The Killers',
      duration: '3:42',
      albumArt: 'https://images.unsplash.com/photo-1618972677328-9cd129a74c14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpZSUyMHJvY2slMjBhbGJ1bXxlbnwxfHx8fDE3NzU2NzEyMTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
      platform: 'spotify' as const,
    },
    {
      id: 4,
      title: 'Good Days',
      artist: 'SZA',
      duration: '4:39',
      albumArt: 'https://images.unsplash.com/photo-1660087031197-f483b4388e91?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXAlMjBob3AlMjB2aW55bCUyMHJlY29yZHxlbnwxfHx8fDE3NzU2NzEyMTR8MA&ixlib=rb-4.1.0&q=80&w=1080',
      platform: 'amazon' as const,
    },
    {
      id: 5,
      title: 'Levitating',
      artist: 'Dua Lipa',
      duration: '3:23',
      albumArt: 'https://images.unsplash.com/photo-1510809393-728d340e4eb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3AlMjBtdXNpYyUyMGNvbmNlcnR8ZW58MXx8fHwxNzc1NTU4NDE4fDA&ixlib=rb-4.1.0&q=80&w=1080',
      isNew: true,
      platform: 'spotify' as const,
    },
    {
      id: 6,
      title: 'Take Five',
      artist: 'Dave Brubeck',
      duration: '5:24',
      albumArt: 'https://images.unsplash.com/photo-1768106047968-d64605ca580f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXp6JTIwbXVzaWMlMjBhZXN0aGV0aWN8ZW58MXx8fHwxNzc1NjcxMjE1fDA&ixlib=rb-4.1.0&q=80&w=1080',
      platform: 'amazon' as const,
    },
    {
      id: 7,
      title: 'Midnight City',
      artist: 'M83',
      duration: '4:04',
      albumArt: 'https://images.unsplash.com/photo-1681670251071-49ec1d11cfc7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzeW50aHdhdmUlMjBuZW9uJTIwbXVzaWN8ZW58MXx8fHwxNzc1NjcxMjE1fDA&ixlib=rb-4.1.0&q=80&w=1080',
      platform: 'spotify' as const,
    },
    {
      id: 8,
      title: 'Wonderwall',
      artist: 'Oasis',
      duration: '4:18',
      albumArt: 'https://images.unsplash.com/photo-1620323610423-7ac1cf365b6f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhY291c3RpYyUyMGd1aXRhciUyMGFsYnVtfGVufDF8fHx8MTc3NTYzMDE4Nnww&ixlib=rb-4.1.0&q=80&w=1080',
      platform: 'amazon' as const,
    },
  ];

  useEffect(() => {
    // Simulate a delay to show loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Content style={{ 
      maxWidth: '480px', 
      margin: '0 auto', 
      padding: '72px 20px 100px',
      width: '100%'
    }}>
      {/* Playlist Hero Section */}
      <div style={{ marginBottom: '16px' }}>
        <PlaylistHero
          albumImages={albumImages}
          isLoading={isLoading}
        />
      </div>

      {/* Sync Status Bar */}
      <div style={{ marginBottom: '24px' }}>
        <SyncStatusBar isLoading={isLoading} />
      </div>

      {/* Track List */}
      {isLoading ? (
        <Card
          style={{
            background: 'rgba(28, 31, 33, 0.4)',
            border: '1px solid rgba(56, 189, 248, 0.1)',
            borderRadius: '16px',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden'
          }}
          styles={{ body: { padding: '16px' } }}
        >
          <Flex vertical gap={12}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Flex key={i} align="center" gap={12}>
                <Skeleton.Avatar 
                  active 
                  size={48} 
                  style={{ 
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.1)'
                  }} 
                />
                <div style={{ flex: 1 }}>
                  <Skeleton.Input 
                    active 
                    size="small" 
                    style={{ 
                      width: '60%', 
                      marginBottom: '6px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      borderRadius: '6px'
                    }} 
                  />
                  <Skeleton.Input 
                    active 
                    size="small" 
                    style={{ 
                      width: '40%',
                      background: 'rgba(56, 189, 248, 0.08)',
                      borderRadius: '6px'
                    }} 
                  />
                </div>
                <Skeleton.Input 
                  active 
                  size="small" 
                  style={{ 
                    width: '40px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    borderRadius: '6px'
                  }} 
                />
              </Flex>
            ))}
          </Flex>
        </Card>
      ) : (
        <TrackList tracks={tracks} />
      )}
      <LaunchStreamingFAB />
    </Content>
  );
}