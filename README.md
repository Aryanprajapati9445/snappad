# Snappad

Snappad is a personal knowledge vault for saving things you want to find later. It is built for people who collect links, notes, screenshots, files, and snippets from across the web and want one place to keep them organized.

## About The App

The app focuses on capture first and retrieval second. You can save content quickly, keep it organized with tags, and come back to it through search or filters instead of digging through bookmarks, tabs, or scattered notes.

## Core Experience

- Save links, notes, images, and files in one place.
- Capture content from the browser with a quick-save flow.
- Preview and enrich saved links so they are easier to recognize later.
- Organize content with tags and filters.
- Search across your saved items to find information quickly.
- Keep your vault tied to a private account.
- Reset access and manage your profile when needed.

## Who It Is For

Snappad is meant for anyone building a personal reference library: students, researchers, developers, product teams, or people who just want a better alternative to an overflowing bookmark list.

## Typical Use Cases

- Save an article before reading it later.
- Clip a useful tool, tutorial, or reference link.
- Store a note alongside related tags for future recall.
- Keep images or files attached to a topic you revisit often.
- Collect research in one searchable vault instead of multiple apps.

## At A Glance

- Private personal vault for web content and notes
- Fast search and tag-based organization
- Account-based access with sign-in and recovery flows
- Browser extension support for quick capture

## Repository Overview

- `frontend/` - web app experience for browsing and managing saved content
- `backend/` - API that powers authentication, content storage, search, and uploads
- `extension/` - browser extension for capturing content from the web

## Getting Started

If you want to run the project locally, use the scripts in the root `package.json` and the workspace folders. The app is split into frontend and backend workspaces, so the usual flow is to install dependencies, start the backend, and then start the frontend.

## Deployment Notes

This repository includes AWS deployment guides in the root folder for teams that want to host the app in cloud infrastructure.
