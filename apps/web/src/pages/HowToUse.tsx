import { Layout, Typography, Flex, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const { Content } = Layout
const { Title, Text, Paragraph } = Typography

const SL = {
  bg: '#111314', surface: '#1C1F21', nav: '#161819', border: '#2A2D30',
  accent: '#38BDF8', mint: '#4ADE80', text: '#F1F5F9', muted: '#64748B',
}

interface Step {
  n: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    n: '01',
    title: 'Connect a music service',
    body: 'Open Settings and connect Spotify or Apple Music. ShareList stores the connection on the server — it never streams audio. It only reads and updates playlist metadata and track lists.',
  },
  {
    n: '02',
    title: 'Create a ShareList',
    body: 'From My Lists, create a ShareList and pick one of your playlists. That playlist is linked as the starting copy. The songs you see in ShareList come from the linked playlists, not from a separate ShareList library.',
  },
  {
    n: '03',
    title: 'Invite a friend',
    body: 'On Friends, send an invite with an email and the ShareList you want to share. They get a link, sign up or sign in, and land on My Friends. Shared lists show with a mint accent on My Lists.',
  },
  {
    n: '04',
    title: 'Link their playlist',
    body: 'Your friend opens the shared list, taps Manage List, and links one of their playlists on the same service. Both of you then contribute to the same ShareList.',
  },
  {
    n: '05',
    title: 'Merge with Sync Lists',
    body: 'Sync Lists copies songs that are missing from each linked playlist into the others (same service). Linking a playlist also runs this automatically. After a merge, each person keeps their own playlist in Spotify or Apple Music — now with the combined tracks.',
  },
  {
    n: '06',
    title: 'Refresh with Fetch Songs',
    body: 'Fetch Songs only updates what you see in ShareList: playlist name, artwork, and the current song list. It does not add songs to Spotify or Apple Music.',
  },
  {
    n: '07',
    title: 'Leave or delete without wiping friends',
    body: "Manage List lets you unlink a playlist, leave a shared list, or delete a list you own. Streaming playlists are never deleted. If you own the list and delete it, friends keep the playlists they contributed as their own ShareLists. Songs are not removed from anyone's streaming playlist.",
  },
]

interface DefinitionRow {
  key: string
  term: string
  meaning: string
  accent?: 'accent' | 'mint'
}

interface DefinitionGroup {
  title: string
  hint: string
  rows: DefinitionRow[]
}

const DEFINITION_GROUPS: DefinitionGroup[] = [
  {
    title: 'The app',
    hint: 'What you are looking at',
    rows: [
      {
        key: 'sharelist',
        term: 'ShareList',
        meaning: 'A shared list in this app that points at one or more playlists on Spotify or Apple Music. It is a sharing layer, not a music player.',
      },
      {
        key: 'my-lists',
        term: 'My Lists',
        meaning: 'Home. Lists you created plus lists friends shared with you. Shared lists use a mint highlight.',
      },
      {
        key: 'linked-playlist',
        term: 'Linked playlist',
        meaning: 'A real playlist on a streaming service attached to a ShareList. Each person usually links their own playlist.',
      },
      {
        key: 'primary',
        term: 'Primary playlist',
        meaning: 'The main linked playlist on a ShareList. Its name and artwork are used for the ShareList cover.',
      },
    ],
  },
  {
    title: 'Sharing',
    hint: 'Working with other people',
    rows: [
      {
        key: 'friend',
        term: 'Friend',
        meaning: 'Someone you invited to a ShareList (or who invited you). They can view the list and link their own playlist.',
      },
      {
        key: 'invite',
        term: 'Invite',
        meaning: 'An email with a link to join a specific ShareList. Pending invites can be resent or deleted from My Friends.',
      },
      {
        key: 'collaborator',
        term: 'Collaborator',
        meaning: 'A friend who has accepted the invite. They have the same manage access: link, unlink, and leave.',
      },
      {
        key: 'manage',
        term: 'Manage List',
        meaning: 'The panel on a ShareList for adding another playlist, unlinking one, leaving, or deleting (owner only).',
      },
    ],
  },
  {
    title: 'Sync',
    hint: 'The two buttons that are easy to mix up',
    rows: [
      {
        key: 'force-sync',
        term: 'Fetch Songs',
        accent: 'accent',
        meaning: 'Reloads the ShareList in the app. Pulls fresh names, artwork, and songs from each linked playlist. Does not write anything back to Spotify or Apple Music.',
      },
      {
        key: 'cross-sync',
        term: 'Sync Lists',
        accent: 'mint',
        meaning: "Merges tracks across linked playlists on the same service. Songs in A's playlist that B is missing are added to B's playlist, and the other way around. This is the only sync that changes streaming playlists.",
      },
      {
        key: 'unique-songs',
        term: 'Unique songs',
        meaning: "In the app, a song that exists in more than one linked playlist is shown once. After Sync Lists the same track may still live in each person's Spotify or Apple playlist - that is expected.",
      },
    ],
  },
  {
    title: 'Leaving',
    hint: 'What gets removed — and what does not',
    rows: [
      {
        key: 'unlink',
        term: 'Unlink',
        meaning: 'Detaches a playlist from the ShareList. The playlist stays on the streaming service with its songs intact.',
      },
      {
        key: 'leave',
        term: 'Leave',
        meaning: "A collaborator exits a shared ShareList. Their linked playlists become their own ShareList on My Lists. The owner's list stays.",
      },
      {
        key: 'delete',
        term: 'Delete ShareList',
        meaning: 'The owner removes their ShareList. Friends who contributed keep their own copies. No streaming playlist is deleted and no songs are removed from Spotify or Apple Music.',
      },
    ],
  },
]

function definitionColumns(): ColumnsType<DefinitionRow> {
  return [
    {
      title: 'Term',
      dataIndex: 'term',
      key: 'term',
      width: 168,
      render: (term: string, row) => (
        <Text
          style={{
            color: row.accent === 'mint' ? SL.mint : row.accent === 'accent' ? SL.accent : SL.text,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '-0.2px',
          }}
        >
          {term}
        </Text>
      ),
    },
    {
      title: 'Meaning',
      dataIndex: 'meaning',
      key: 'meaning',
      render: (meaning: string) => (
        <Text style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.6 }}>{meaning}</Text>
      ),
    },
  ]
}

export function HowToUse() {
  return (
    <Content style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 20px 48px', width: '100%' }}>
      <Flex vertical gap={8} style={{ marginBottom: 28 }}>
        <Text style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: SL.muted,
        }}>
          Guide
        </Text>
        <Title level={2} style={{ color: SL.text, margin: 0, fontWeight: 700, letterSpacing: '-0.4px' }}>
          How to use ShareList
        </Title>
        <Paragraph style={{ color: SL.muted, fontSize: 15, lineHeight: 1.65, margin: 0 }}>
          ShareList lets people on different accounts share a playlist. Each person keeps their own playlist on Spotify or Apple Music. ShareList is the list in the middle — it does not play songs.
        </Paragraph>
      </Flex>

      <Flex vertical gap={12} style={{ marginBottom: 40 }}>
        {STEPS.map(step => (
          <div
            key={step.n}
            style={{
              background: SL.surface,
              border: `1px solid ${SL.border}`,
              borderRadius: 16,
              padding: '18px 20px',
            }}
          >
            <Flex gap={14} align="flex-start">
              <Text style={{
                color: SL.accent,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.06em',
                fontVariantNumeric: 'tabular-nums',
                paddingTop: 2,
                flexShrink: 0,
              }}>
                {step.n}
              </Text>
              <div>
                <Text style={{ color: SL.text, fontWeight: 600, fontSize: 15, display: 'block', marginBottom: 6 }}>
                  {step.title}
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.65 }}>
                  {step.body}
                </Text>
              </div>
            </Flex>
          </div>
        ))}
      </Flex>

      <Flex vertical gap={8} style={{ marginBottom: 20 }}>
        <Text style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: SL.muted,
        }}>
          Glossary
        </Text>
        <Title level={3} style={{ color: SL.text, margin: 0, fontWeight: 700, fontSize: 20 }}>
          Definitions
        </Title>
        <Paragraph style={{ color: SL.muted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Fetch Songs and Sync Lists are not the same action. Fetch Songs refreshes the view. Sync Lists copies missing songs into each linked playlist.
        </Paragraph>
      </Flex>

      <Flex vertical gap={20}>
        {DEFINITION_GROUPS.map(group => (
          <div
            key={group.title}
            style={{
              background: SL.surface,
              border: `1px solid ${SL.border}`,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <Flex
              justify="space-between"
              align="center"
              wrap="wrap"
              gap={8}
              style={{
                padding: '14px 18px',
                borderBottom: `1px solid ${SL.border}`,
                background: 'rgba(17, 19, 20, 0.45)',
              }}
            >
              <Text style={{ color: SL.text, fontWeight: 600, fontSize: 14 }}>{group.title}</Text>
              <Tag
                style={{
                  margin: 0,
                  borderRadius: 20,
                  background: 'transparent',
                  borderColor: SL.border,
                  color: SL.muted,
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                {group.hint}
              </Tag>
            </Flex>
            <Table
              dataSource={group.rows}
              columns={definitionColumns()}
              rowKey="key"
              pagination={false}
              size="middle"
              style={{ background: 'transparent' }}
            />
          </div>
        ))}
      </Flex>
    </Content>
  )
}
