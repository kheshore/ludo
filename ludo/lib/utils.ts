// ============================================================
// Utility functions
// ============================================================

import { v4 as uuidv4 } from 'uuid';

export function generateSlug(username: string): string {
  const base = username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12);
  const suffix = uuidv4().slice(0, 4);
  return `${base}-${suffix}`;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateInviteLink(roomCode: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/join/${roomCode}`;
  }
  return `/join/${roomCode}`;
}

export function generateProfileLink(slug: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/u/${slug}`;
  }
  return `/u/${slug}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function getWinRate(wins: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((wins / total) * 100)}%`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain an uppercase letter' };
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain a lowercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain a number' };
  return { valid: true, message: '' };
}

export function validateUsername(username: string): { valid: boolean; message: string } {
  if (username.length < 3) return { valid: false, message: 'Username must be at least 3 characters' };
  if (username.length > 20) return { valid: false, message: 'Username must be under 20 characters' };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return { valid: false, message: 'Only letters, numbers, and underscores' };
  return { valid: true, message: '' };
}
