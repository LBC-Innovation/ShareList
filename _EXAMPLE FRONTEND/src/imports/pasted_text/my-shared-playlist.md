Design a high-fidelity mobile-first web app screen for a music playlist sharing service called "ShareList". This is the My Shared Playlist view — the primary screen users land on after logging in.

VISUAL IDENTITY & FEEL
The aesthetic should feel like a premium 2026 streaming music app — think the polish of Spotify combined with the spatial depth of Apple Music, but with its own identity. The design language should feel alive, not flat. Use subtle gradients, layered glass-morphism card surfaces, and micro-depth through shadow and blur. The overall impression should be: "this belongs next to Spotify on my phone."

COLOR SYSTEM

Background: Deep charcoal #111314, not pure black — there should be warmth in the darkness
Surface cards: #1C1F21 with a very subtle frosted glass effect (backdrop-filter: blur) for elevated elements
Primary accent: Sky/neon blue #38BDF8 — used for interactive elements, active states, progress indicators, and highlights
Secondary accent: Pop mint green #4ADE80 — used sparingly for "shared/synced" status indicators, badges, and success states
Text primary: #F1F5F9
Text secondary: #64748B
Dividers/borders: #2A2D30
Gradient accent wash: A very subtle radial gradient in the top-left background area — blending #38BDF8 at ~6% opacity bleeding into the dark background, giving the page a faint "glow source" feel


TYPOGRAPHY

Font family: Inter (or equivalent modern geometric sans-serif)
Playlist title: 26px, weight 700, tight letter-spacing
Track title: 15px, weight 500
Artist/album: 13px, weight 400, secondary text color
Labels/badges: 11px, weight 600, uppercase, wide letter-spacing


LAYOUT — SCREEN STRUCTURE (top to bottom)
1. Top Navigation Bar

Left: ShareList logo — wordmark using a custom ligature-style treatment, "Share" in white weight 300, "List" in the sky blue accent, weight 700. Small icon to the left: two overlapping music note glyphs forming a share/link symbol.
Center: Nothing (clean)
Right: User avatar (circular, 34px) with a mint green dot indicator showing "syncing active". A small bell icon for notifications.

2. Playlist Hero Section

A large rounded card (border-radius: 20px) spanning full width with padding
Background: a blurred, dark-tinted gradient that hints at album art color without showing a specific image — think the "ambient color" effect Spotify uses behind now-playing
Inside the card:

Top-left: A mosaic playlist cover — 2x2 grid of four small album art thumbnails (placeholder squares with subtle image placeholders), total size ~72x72px, rounded corners
To the right of the mosaic: Playlist name in large bold text: "Road Trip Mix 🎧", below it a subtitle: "Shared with Marcus · 47 songs · 3h 12m"
Below subtitle: Two platform badges side by side — one showing the Spotify logo style mark with label "Your platform", one showing an Amazon Music-style mark with label "Marcus's platform". Each badge is a pill shape, dark background, with the respective platform's accent color as a left border stripe.
Bottom of card: A row with three actions — Shuffle (sky blue icon + label), Play (filled sky blue circle button, larger, center), Add Song (outline icon + label)



3. Sync Status Bar

A slim full-width strip just below the hero card
Left side: mint green pulsing dot + text: "Live sync active — last updated 2 min ago"
Right side: a small "Manage" text link in sky blue

4. Section Header

Text: "Songs" — 18px, weight 600, white
Right-aligned: a sort/filter icon in secondary text color

5. Track List

Display 8 visible track rows (with implied scroll below)
Each track row:

Height: ~64px
Left: track number in secondary text color (small), then album art thumbnail (40x40px, rounded 6px)
Center: track title (primary text, 15px 500), below it artist name (secondary text, 13px)
Right side indicators: duration in secondary text, and on some tracks a mint green "NEW" badge pill (11px, uppercase) to indicate recently synced tracks
On one track row, show an active/playing state — the track number replaced by a small animated equalizer bar graphic in sky blue, the track title in sky blue instead of white
Subtle separator line between rows at #2A2D30
On every other row, show a tiny platform source icon (Spotify vs Amazon) at far right, very small ~16px, to indicate which user added that track



6. Bottom Navigation Bar

Fixed bottom bar, #161819 background with top border #2A2D30
Four icons: Home (grid), My Lists (playlist stack, currently active — sky blue, with sky blue underline dot), Friends (people icon), Settings (gear)
Labels below each icon, 10px


ADDITIONAL DESIGN DETAILS

All interactive elements (buttons, rows) should show a hover/press state design — slightly lighter surface on press
The overall spacing should be generous — this is not a dense data app, it should feel breathable
Rounded corners everywhere: cards 20px, badges 100px pill, thumbnails 6-8px, buttons 12px
The "NEW" sync badge should use mint green #4ADE80 at 15% opacity as fill, with #4ADE80 text — glowing softly
Include a floating mini-player bar docked just above the bottom nav — showing current track thumbnail, title, artist, a progress bar in sky blue, and a pause button. Height ~60px, surface color #1E2124, full width, rounded top corners only.


MOOD REFERENCE
The finished screen should evoke: Spotify's dark polish + the connectivity feel of a shared social app + the precision of a 2026 product design system. It should look like something featured in a Dribbble "Best of 2026" collection.