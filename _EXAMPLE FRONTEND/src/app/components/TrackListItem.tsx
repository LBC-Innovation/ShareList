import { Flex } from 'antd';
import { Equalizer } from './Equalizer';

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: string;
  isPlaying?: boolean;
  isNew?: boolean;
  platform?: 'spotify' | 'amazon';
}

interface TrackListItemProps {
  track: Track;
}

export function TrackListItem({ track }: TrackListItemProps) {
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(28, 31, 33, 0.5)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      {/* Track Number / Equalizer */}
      <div style={{
        width: '16px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {track.isPlaying ? (
          <Equalizer />
        ) : (
          <span style={{ fontSize: '13px', color: '#64748B' }}>{track.id}</span>
        )}
      </div>
      
      {/* Album Art */}
      <img
        src={track.albumArt}
        alt={track.album}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '6px',
          objectFit: 'cover',
          flexShrink: 0
        }}
      />
      
      {/* Track Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '15px',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: track.isPlaying ? '#38BDF8' : '#F1F5F9'
        }}>
          {track.title}
        </div>
        <div style={{
          fontSize: '13px',
          color: '#64748B',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {track.artist}
        </div>
      </div>
      
      {/* Right Side */}
      <Flex align="center" gap={12} style={{ flexShrink: 0 }}>
        {track.isNew && (
          <div style={{
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: 'rgba(74, 222, 128, 0.15)',
            color: '#4ADE80',
            border: '1px solid rgba(74, 222, 128, 0.3)'
          }}>
            NEW
          </div>
        )}
        
        {track.platform && (
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            backgroundColor: track.platform === 'spotify' ? '#1DB954' : '#00D4FF'
          }}>
            {track.platform === 'spotify' ? (
              <svg style={{ width: '10px', height: '10px', color: 'white' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            ) : (
              <svg style={{ width: '8px', height: '8px', color: 'white' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </div>
        )}
        
        <span style={{
          fontSize: '13px',
          color: '#64748B',
          width: '40px',
          textAlign: 'right'
        }}>
          {track.duration}
        </span>
      </Flex>
    </div>
  );
}
