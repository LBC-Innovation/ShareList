import { Card, Button, Flex, Space, Skeleton } from 'antd';
import { LinkOutlined, ShareAltOutlined } from '@ant-design/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpotify, faAmazon } from '@fortawesome/free-brands-svg-icons';

interface PlaylistHeroProps {
  albumImages: string[];
  isLoading?: boolean;
  onLinkPlatform?: () => void;
}

export function PlaylistHero({ albumImages, isLoading = false, onLinkPlatform }: PlaylistHeroProps) {
  return (
    <Card
      variant="borderless"
      style={{
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(74, 222, 128, 0.1) 50%, rgba(28, 31, 33, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.1)',
      }}
      styles={{ body: { padding: '20px' } }}
    >
      <Flex gap={16} style={{ marginBottom: '20px' }}>
        {/* Mosaic Cover */}
        {isLoading ? (
          <Skeleton.Avatar
            active
            size={72}
            shape="square"
            style={{
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.1)',
              flexShrink: 0
            }}
          />
        ) : (
          <div style={{
            flexShrink: 0,
            width: '72px',
            height: '72px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '4px',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {albumImages.slice(0, 4).map((img, idx) => (
              <div key={`album-${idx}`} style={{ position: 'relative', background: '#1C1F21' }}>
                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}

        {/* Playlist Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isLoading ? (
            <>
              <Skeleton.Input
                active
                size="small"
                style={{
                  width: '70%',
                  height: '28px',
                  marginBottom: '8px',
                  background: 'rgba(56, 189, 248, 0.1)',
                  borderRadius: '6px'
                }}
              />
              <Skeleton.Input
                active
                size="small"
                style={{
                  width: '90%',
                  height: '16px',
                  marginBottom: '12px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  borderRadius: '6px'
                }}
              />
              <Flex gap={8}>
                <Skeleton.Button
                  active
                  size="small"
                  style={{
                    width: '110px',
                    height: '28px',
                    borderRadius: '20px',
                    background: 'rgba(56, 189, 248, 0.1)'
                  }}
                />
                <Skeleton.Button
                  active
                  size="small"
                  style={{
                    width: '130px',
                    height: '28px',
                    borderRadius: '20px',
                    background: 'rgba(56, 189, 248, 0.1)'
                  }}
                />
              </Flex>
            </>
          ) : (
            <>
              <h1 style={{
                color: '#F1F5F9',
                fontSize: '26px',
                fontWeight: 700,
                letterSpacing: '-0.5px',
                lineHeight: '1.2',
                margin: '0 0 4px 0'
              }}>
                Road Trip Mix 🎧
              </h1>
              <p style={{
                color: '#64748B',
                fontSize: '13px',
                fontWeight: 400,
                lineHeight: '1.4',
                margin: '0 0 12px 0'
              }}>
                Shared with Marcus · 47 songs · 3h 12m
              </p>
              
              {/* Platform Badges */}
              <Flex gap={8}>
                <Flex align="center" gap={8} style={{
                  background: 'rgba(28, 31, 33, 0.8)',
                  borderRadius: '20px',
                  paddingRight: '12px',
                  paddingLeft: '4px',
                  paddingTop: '4px',
                  paddingBottom: '4px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#1DB954',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FontAwesomeIcon icon={faSpotify} style={{ color: 'white', fontSize: '12px' }} />
                  </div>
                  <span style={{ color: '#F1F5F9', fontSize: '11px', fontWeight: 600 }}>Your platform</span>
                </Flex>
                
                <Flex align="center" gap={8} style={{
                  background: 'rgba(28, 31, 33, 0.8)',
                  borderRadius: '20px',
                  paddingRight: '12px',
                  paddingLeft: '4px',
                  paddingTop: '4px',
                  paddingBottom: '4px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#00D9FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FontAwesomeIcon icon={faAmazon} style={{ color: 'white', fontSize: '12px' }} />
                  </div>
                  <span style={{ color: '#F1F5F9', fontSize: '11px', fontWeight: 600 }}>Marcus's platform</span>
                </Flex>
              </Flex>
            </>
          )}
        </div>
      </Flex>

      {/* Action Buttons */}
      <Flex justify="center" align="center" gap={24} style={{
        paddingTop: '16px',
        borderTop: '1px solid #2A2D30'
      }}>
        <button
          onClick={onLinkPlatform}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          <LinkOutlined style={{ fontSize: '20px', color: '#38BDF8' }} />
          <span style={{ color: '#38BDF8', fontSize: '12px', fontWeight: 600 }}>Link Platform</span>
        </button>

        <button
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          <ShareAltOutlined style={{ fontSize: '20px', color: '#38BDF8' }} />
          <span style={{ color: '#38BDF8', fontSize: '12px', fontWeight: 600 }}>Manage Syncs</span>
        </button>
      </Flex>
    </Card>
  );
}