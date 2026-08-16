import { Layout, Card, Flex, Typography, Tag, Empty } from 'antd';
import { PlusCircle } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpotify, faAmazon, faApple } from '@fortawesome/free-brands-svg-icons';
import { useNavigate } from 'react-router';

const { Content } = Layout;
const { Text, Title } = Typography;

interface ShareList {
  id: string;
  name: string;
  platforms: string[];
  trackCount: number;
  collaborators: string[];
  isShared: boolean;
  coverImages: string[];
}

export function ShareListsView() {
  const navigate = useNavigate();

  // Mock data - replace with actual data
  const shareLists: ShareList[] = [
    {
      id: '1',
      name: 'Road Trip Mix 🎧',
      platforms: ['spotify', 'amazon'],
      trackCount: 47,
      collaborators: ['Marcus'],
      isShared: false,
      coverImages: [
        'https://images.unsplash.com/photo-1644855640845-ab57a047320e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbGJ1bSUyMGNvdmVyJTIwbXVzaWMlMjBhcnR8ZW58MXx8fHwxNzc1NjcxMjEzfDA&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1703115015343-81b498a8c080?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljJTIwbXVzaWMlMjBhbGJ1bXxlbnwxfHx8fDE3NzU2NzEyMTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1618972677328-9cd129a74c14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpZSUyMHJvY2slMjBhbGJ1bXxlbnwxfHx8fDE3NzU2NzEyMTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1660087031197-f483b4388e91?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXAlMjBob3AlMjB2aW55bCUyMHJlY29yZHxlbnwxfHx8fDE3NzU2NzEyMTR8MA&ixlib=rb-4.1.0&q=80&w=1080',
      ],
    },
    {
      id: '2',
      name: 'Workout Vibes',
      platforms: ['spotify'],
      trackCount: 32,
      collaborators: ['Sarah'],
      isShared: true,
      coverImages: [
        'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b3Jrb3V0JTIwbXVzaWN8ZW58MXx8fHwxNzc1NjcxMjE0fDA&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1574169208507-84376144848b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHx3b3Jrb3V0JTIwbXVzaWN8ZW58MXx8fHwxNzc1NjcxMjE0fDA&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1485579149621-3123dd979885?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHx3b3Jrb3V0JTIwbXVzaWN8ZW58MXx8fHwxNzc1NjcxMjE0fDA&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw0fHx3b3Jrb3V0JTIwbXVzaWN8ZW58MXx8fHwxNzc1NjcxMjE0fDA&ixlib=rb-4.1.0&q=80&w=1080',
      ],
    },
    {
      id: '3',
      name: 'Chill Evenings',
      platforms: ['apple', 'spotify'],
      trackCount: 58,
      collaborators: ['Alex', 'Jordan'],
      isShared: true,
      coverImages: [
        'https://images.unsplash.com/photo-1511379938547-c1f69419868d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlsbCUyMG11c2ljfGVufDF8fHx8MTc3NTY3MTIxNXww&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxjaGlsbCUyMG11c2ljfGVufDF8fHx8MTc3NTY3MTIxNXww&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxjaGlsbCUyMG11c2ljfGVufDF8fHx8MTc3NTY3MTIxNXww&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw0fHxjaGlsbCUyMG11c2ljfGVufDF8fHx8MTc3NTY3MTIxNXww&ixlib=rb-4.1.0&q=80&w=1080',
      ],
    },
  ];

  const platformIcons: { [key: string]: { icon: any; color: string } } = {
    spotify: { icon: faSpotify, color: '#1DB954' },
    amazon: { icon: faAmazon, color: '#00D9FF' },
    apple: { icon: faApple, color: '#FA243C' },
  };

  return (
    <Content style={{
      maxWidth: '480px',
      margin: '0 auto',
      padding: '72px 20px 100px',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title
          level={1}
          style={{
            color: '#F1F5F9',
            margin: 0,
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.5px',
            marginBottom: '4px'
          }}
        >
          My ShareLists
        </Title>
        <Text style={{ color: '#94A3B8', fontSize: '14px' }}>
          {shareLists.length} {shareLists.length === 1 ? 'playlist' : 'playlists'}
        </Text>
      </div>

      {/* ShareLists */}
      {shareLists.length === 0 ? (
        <Card
          style={{
            background: 'rgba(28, 31, 33, 0.4)',
            border: '1px solid rgba(56, 189, 248, 0.1)',
            borderRadius: '16px',
            backdropFilter: 'blur(20px)',
          }}
          styles={{ body: { padding: '60px 20px' } }}
        >
          <Empty
            image={<PlusCircle style={{ fontSize: '64px', color: '#64748B', opacity: 0.5 }} />}
            description={
              <div style={{ marginTop: '16px' }}>
                <Text style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  No ShareLists Yet
                </Text>
                <Text style={{ color: '#64748B', fontSize: '13px', display: 'block', lineHeight: '1.6' }}>
                  Create your first ShareList to start syncing playlists across music services
                </Text>
              </div>
            }
          />
        </Card>
      ) : (
        <Flex vertical gap={12}>
          {shareLists.map((list) => (
            <Card
              key={list.id}
              hoverable
              onClick={() => navigate(`/list/${list.id}`)}
              style={{
                background: 'rgba(28, 31, 33, 0.4)',
                border: '1px solid rgba(56, 189, 248, 0.1)',
                borderRadius: '16px',
                backdropFilter: 'blur(20px)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              styles={{ body: { padding: '16px' } }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(28, 31, 33, 0.4)';
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.1)';
              }}
            >
              <Flex gap={12} align="center">
                {/* Mosaic Cover */}
                <div style={{
                  flexShrink: 0,
                  width: '64px',
                  height: '64px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '3px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#1C1F21'
                }}>
                  {list.coverImages.slice(0, 4).map((img, idx) => (
                    <div key={`cover-${idx}`} style={{ position: 'relative' }}>
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>

                {/* List Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Flex align="center" gap={8} style={{ marginBottom: '4px' }}>
                    <Text style={{
                      color: '#F1F5F9',
                      fontSize: '15px',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {list.name}
                    </Text>
                    {list.isShared && (
                      <Tag style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        color: '#A78BFA',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        margin: 0,
                        lineHeight: '16px'
                      }}>
                        Shared
                      </Tag>
                    )}
                  </Flex>

                  <Text style={{
                    color: '#64748B',
                    fontSize: '13px',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    {list.trackCount} songs • {list.collaborators.join(', ')}
                  </Text>

                  {/* Platform Icons */}
                  <Flex align="center" gap={6}>
                    {list.platforms.map((platform) => {
                      const platformInfo = platformIcons[platform];
                      return (
                        <div
                          key={platform}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: `${platformInfo.color}20`,
                            border: `1px solid ${platformInfo.color}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <FontAwesomeIcon
                            icon={platformInfo.icon}
                            style={{ fontSize: '12px', color: platformInfo.color }}
                          />
                        </div>
                      );
                    })}
                  </Flex>
                </div>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </Content>
  );
}
