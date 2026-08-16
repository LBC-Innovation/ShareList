# ShareList Design System

Derived from the official Figma mockup in `_EXAMPLE FRONTEND/`.
**All frontend work must follow this guide.** No Tailwind. No utility classes. Pure Ant Design + inline styles.

---

## Framework

- **Library:** `antd` v6 + `@ant-design/icons`
- **No Tailwind** — do not install or use any Tailwind utilities
- **Styling:** Ant Design component props + `style={{}}` inline styles only
- **Theme:** `ConfigProvider` with `theme.darkAlgorithm` + custom token overrides

---

## ConfigProvider Setup

This lives in `apps/web/src/App.tsx` and wraps the entire app:

```tsx
import { ConfigProvider, theme } from 'antd'

<ConfigProvider
  theme={{
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: '#38BDF8',
      colorBgBase: '#111314',
      colorBgContainer: '#1C1F21',
      colorBorder: '#2A2D30',
      colorText: '#F1F5F9',
      colorTextSecondary: '#64748B',
      fontFamily: 'Inter, system-ui, sans-serif',
      borderRadius: 8,
    },
    components: {
      Button: { primaryColor: '#38BDF8' },
      Input: { colorBgContainer: '#111314' },
      Badge: { dotSize: 8 },
    },
  }}
>
```

These tokens flow through all antd components automatically. Explicit `style={{}}` overrides are only needed for values outside the token system.

---

## Color Reference

| Name | Hex | Use |
|---|---|---|
| bg | `#111314` | Page/root background |
| surface | `#1C1F21` | Cards, modals, elevated containers |
| nav | `#161819` | Top navigation bar |
| border | `#2A2D30` | Dividers, borders |
| accent | `#38BDF8` | Primary interactive, links, focus rings |
| mint | `#4ADE80` | Success states |
| text | `#F1F5F9` | Primary text |
| muted | `#64748B` | Secondary text, placeholders |

**In every file, define a local `SL` const rather than hardcoding hex strings:**
```tsx
const SL = {
  bg: '#111314', surface: '#1C1F21', nav: '#161819', border: '#2A2D30',
  accent: '#38BDF8', mint: '#4ADE80', text: '#F1F5F9', muted: '#64748B',
}
```

---

## Typography

Use `antd` `Typography.*` components. Apply color and weight via `style`:

```tsx
import { Typography } from 'antd'

<Typography.Title level={3} style={{ color: SL.text, marginTop: 0 }}>Heading</Typography.Title>
<Typography.Text style={{ color: SL.muted, fontSize: 14 }}>Secondary text</Typography.Text>
<Typography.Text style={{ color: SL.text, fontWeight: 600, fontSize: 18 }}>Strong</Typography.Text>

// Section label (uppercase, small)
<Typography.Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: SL.muted }}>
  Section Label
</Typography.Text>
```

### Logo treatment
```tsx
<Link to="/" style={{ textDecoration: 'none' }}>
  <Typography.Text style={{ fontWeight: 300, color: SL.text, fontSize: 16 }}>Share</Typography.Text>
  <Typography.Text style={{ fontWeight: 700, color: SL.accent, fontSize: 16 }}>List</Typography.Text>
</Link>
```

---

## Layout

Use `antd` layout primitives instead of Tailwind flex/grid:

```tsx
import { Flex, Space } from 'antd'

// Flex row
<Flex align="center" justify="space-between" gap={16}>...</Flex>

// Flex column
<Flex vertical gap={12}>...</Flex>

// Space between items
<Space size={8}>...</Space>
<Space direction="vertical" size={20} style={{ width: '100%' }}>...</Space>
```

For page containers use inline styles:
```tsx
// Narrow page (auth, profile)
<div style={{ maxWidth: 448, margin: '0 auto', padding: '48px 16px' }}>

// Wide page (admin)
<div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
```

---

## Surfaces

```tsx
// Card / elevated container
<div style={{
  backgroundColor: SL.surface,
  border: `1px solid ${SL.border}`,
  borderRadius: 20,
  padding: 24,
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
}}>

// Nav bar
<nav style={{
  backgroundColor: SL.nav,
  borderBottom: `1px solid ${SL.border}`,
  padding: '12px 24px',
  position: 'sticky',
  top: 0,
  zIndex: 100,
}}>

// Root background (set on App wrapper div)
<div style={{
  minHeight: '100vh',
  backgroundColor: SL.bg,
  backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(56,189,248,0.06) 0%, rgba(56,189,248,0.02) 40%, transparent 70%)',
}}>
```

---

## Buttons

Use the antd `Button` component. Do not write `<button>` elements.

```tsx
import { Button } from 'antd'

// Primary
<Button type="primary" size="large" style={{ borderRadius: 12, fontWeight: 600 }}>Save</Button>

// Default (outlined)
<Button style={{ borderRadius: 8, borderColor: SL.border, color: SL.muted }}>Cancel</Button>

// Danger
<Button danger style={{ borderRadius: 8 }}>Delete</Button>

// Ghost / link style
<Button type="link" style={{ color: SL.muted, padding: 0 }}>Sign out</Button>

// Small action button
<Button size="small" style={{ borderRadius: 8, borderColor: SL.border, color: SL.muted }}>Manage</Button>

// Loading state
<Button type="primary" loading={loading}>Save</Button>
```

---

## Form Inputs

Use `antd` `Form`, `Input`, `Input.Password`. Do not write raw `<input>` elements.

```tsx
import { Form, Input } from 'antd'

<Form layout="vertical" onFinish={handleFinish} requiredMark={false}>
  <Form.Item
    name="email"
    label={<span style={{ color: SL.text, fontSize: 14, fontWeight: 500 }}>Email</span>}
    rules={[{ required: true, type: 'email' }]}
  >
    <Input placeholder="you@example.com" size="large" style={{ borderRadius: 12 }} />
  </Form.Item>

  <Form.Item
    name="password"
    label={<span style={{ color: SL.text, fontSize: 14, fontWeight: 500 }}>Password</span>}
    rules={[{ required: true, min: 6 }]}
  >
    <Input.Password placeholder="Min 6 characters" size="large" style={{ borderRadius: 12 }} />
  </Form.Item>
</Form>
```

---

## Auth Card Layout

```tsx
<Flex justify="center" align="center" style={{ minHeight: 'calc(100vh - 57px)', padding: 16 }}>
  <div style={{
    width: '100%',
    maxWidth: 448,
    backgroundColor: SL.surface,
    border: `1px solid ${SL.border}`,
    borderRadius: 20,
    padding: 32,
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  }}>
    <Typography.Title level={3} style={{ color: SL.text, marginBottom: 4, marginTop: 0 }}>...</Typography.Title>
    <Typography.Text style={{ color: SL.muted, fontSize: 14, display: 'block', marginBottom: 32 }}>...</Typography.Text>
    {/* Form */}
  </div>
</Flex>
```

---

## Alerts / Feedback

```tsx
import { Alert } from 'antd'

<Alert message="Error message" type="error" showIcon style={{ borderRadius: 10 }} />
<Alert message="Success!" type="success" showIcon style={{ borderRadius: 10 }} />

// Inline success text (compact)
<Typography.Text style={{ color: SL.mint, fontWeight: 500, fontSize: 14 }}>✓ Saved</Typography.Text>
```

---

## Table

```tsx
import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const columns: ColumnsType<MyRow> = [
  {
    title: 'Name',
    key: 'name',
    render: (_, row) => <Typography.Text style={{ color: SL.text }}>{row.name}</Typography.Text>,
  },
]

<Table
  dataSource={rows}
  columns={columns}
  rowKey="id"
  pagination={false}
  style={{ borderRadius: 20, overflow: 'hidden' }}
/>
```

Column headers automatically use `colorTextSecondary`. Row backgrounds use `colorBgContainer` from ConfigProvider.

---

## Modal (Manage panels)

```tsx
import { Modal } from 'antd'

<Modal
  open={isOpen}
  onCancel={onClose}
  width={640}
  footer={<Button onClick={onClose} style={{ borderRadius: 8, borderColor: SL.border, color: SL.muted }}>Close</Button>}
  title={/* custom header content */}
  styles={{
    header: { backgroundColor: SL.surface, borderBottom: `1px solid ${SL.border}`, padding: '20px 24px' },
    body: { padding: 0, maxHeight: '70vh', overflowY: 'auto' },
    footer: { backgroundColor: `${SL.bg}50`, borderTop: `1px solid ${SL.border}`, padding: '12px 24px' },
  }}
>
  {/* Sections separated by manual Divider */}
  <div style={{ padding: '20px 24px' }}>
    {/* section content */}
  </div>
</Modal>

// Section divider (between modal sections — avoids trailing bottom border)
function Divider() {
  return <div style={{ height: 1, backgroundColor: `${SL.border}80`, margin: '0 -24px' }} />
}
```

---

## Tags / Badges

```tsx
import { Tag } from 'antd'

// Status
<Tag color="success" style={{ borderRadius: 20, fontWeight: 600 }}>active</Tag>
<Tag color="error" style={{ borderRadius: 20, fontWeight: 600 }}>suspended</Tag>
<Tag color="warning" style={{ borderRadius: 20, fontWeight: 600 }}>unverified</Tag>

// Permission / info pill
<Tag color="processing" style={{ borderRadius: 6, fontSize: 11, fontWeight: 500 }}>
  {permission.replace('usermanage:', '')}
</Tag>
```

---

## Toggle Switch

```tsx
import { Switch } from 'antd'

<Switch
  checked={isActive}
  disabled={!canEdit}
  onChange={checked => setIsActive(checked)}
/>
```

Ant Design's `Switch` uses `colorPrimary` from ConfigProvider for the active state automatically.

---

## Avatar

```tsx
import { Avatar } from 'antd'
import { UserOutlined } from '@ant-design/icons'

<Avatar
  size={56}
  icon={<UserOutlined />}
  style={{
    backgroundColor: 'rgba(56,189,248,0.15)',
    border: '1px solid rgba(56,189,248,0.3)',
    color: SL.accent,
    fontWeight: 700,
  }}
>
  {initials}
</Avatar>
```

---

## Danger Zone

```tsx
{/* Initial state */}
<Flex align="center" justify="space-between" style={{
  padding: 16, borderRadius: 12,
  border: '1px solid rgba(239,68,68,0.2)',
  backgroundColor: 'rgba(239,68,68,0.05)',
}}>
  <div>
    <Typography.Text style={{ color: '#fca5a5', fontWeight: 500, fontSize: 14, display: 'block' }}>
      Delete this account
    </Typography.Text>
    <Typography.Text style={{ color: '#f87171', fontSize: 12 }}>
      Permanently removes the user and all their data
    </Typography.Text>
  </div>
  <Button danger size="small" onClick={() => setConfirm(true)} style={{ borderRadius: 8, marginLeft: 16 }}>
    Delete user
  </Button>
</Flex>

{/* Confirm state */}
<div style={{
  padding: 16, borderRadius: 12,
  border: '1px solid rgba(239,68,68,0.3)',
  backgroundColor: 'rgba(239,68,68,0.1)',
}}>
  <Typography.Text style={{ color: '#fca5a5', fontWeight: 600, display: 'block', marginBottom: 8 }}>
    This cannot be undone
  </Typography.Text>
  <Flex gap={8} style={{ marginTop: 16 }}>
    <Button danger loading={loading} onClick={onDelete} style={{ borderRadius: 8 }}>
      Yes, delete permanently
    </Button>
    <Button onClick={() => setConfirm(false)} style={{ borderRadius: 8, borderColor: SL.border, color: SL.muted }}>
      Cancel
    </Button>
  </Flex>
</div>
```

---

## Loading / Empty States

```tsx
import { Spin, Flex } from 'antd'

// Full-screen loading
<Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
  <Spin size="large" />
</Flex>

// Section spinner
<Flex justify="center" style={{ padding: 40 }}>
  <Spin />
</Flex>
```

---

## Do Not Use

- Any Tailwind utility class (`flex`, `text-sm`, `bg-sky-400`, etc.)
- Raw `<button>`, `<input>`, `<select>` elements — use antd equivalents
- `bg-white`, `text-gray-*`, `border-gray-*` — these are light-mode
- Custom CSS classes or CSS modules — use inline `style={{}}`
- `sl-*` Tailwind token names — they no longer exist
