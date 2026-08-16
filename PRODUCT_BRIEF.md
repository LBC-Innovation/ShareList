You are helping me build a project called Sharelist. Here is the full context 
before we create any stories or tasks:

## What is Sharelist?
Sharelist is a cross-platform music playlist sharing app. It allows users who 
have different music streaming subscriptions (Spotify, Apple Music, YouTube Music) 
to share playlists with each other regardless of which service each person uses.

## Core problem it solves
If I'm a Spotify user and my friend uses Apple Music, there is currently no easy 
way for me to share a playlist with them in a format they can actually use. 
Sharelist acts as the neutral layer between streaming platforms.

## What it does
- Users connect one or more streaming service accounts via OAuth
- Users can create Sharelist-native playlists by pulling songs from any of their 
  connected services
- Users can share those playlists with other Sharelist users or via a public link
- Recipients can see which songs in a shared playlist are available on their own 
  connected services
- Recipients can export a shared playlist directly into their streaming service 
  of choice

## What it does NOT do (out of scope)
- Sharelist is not a music player — it does not stream audio
- Sharelist does not host or store any music files
- Sharelist does not replace any streaming service
- Sharelist does not support podcast or audiobook content, only music tracks
- Sharelist does not support downloading or offline access

## Target user
Someone who actively uses a music streaming service and regularly shares music 
recommendations with friends or collaborators who may be on different platforms.

## Tech assumptions
- Web app first (mobile later)
- OAuth integrations with Spotify, Apple Music, and YouTube Music
- Song matching between platforms will use a combination of ISRC codes and 
  fuzzy metadata matching as fallback

Please confirm you have this context and we will begin creating epics and stories.