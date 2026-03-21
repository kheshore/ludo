// ============================================================
// POST /api/auth/signup — Create a new user
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import UserModel from '@/lib/models/user.model';
import { generateSlug } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { username, nickname, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }

    // Check duplicate username (case-insensitive)
    const existing = await UserModel.findOne({
      username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Username already taken' }, { status: 409 });
    }

    const id = uuidv4();
    const slug = generateSlug(username);
    const passwordHash = await bcrypt.hash(password, 10);

    const avatars = ['🎲', '🎯', '🏆', '⭐', '🔥', '💎', '🎮', '🃏'];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];

    const user = await UserModel.create({
      _id: id,
      slug,
      username,
      nickname: nickname || username,
      passwordHash,
      avatar,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      isOnline: true,
    });

    return NextResponse.json({ success: true, user: user.toJSON() });
  } catch (err: unknown) {
    console.error('Signup error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
