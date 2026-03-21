// ============================================================
// PATCH /api/auth/profile — Update nickname
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import UserModel from '@/lib/models/user.model';

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const { userId, nickname } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    const update: Record<string, string> = {};
    if (nickname) update.nickname = nickname;

    const user = await UserModel.findByIdAndUpdate(userId, update, { new: true });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: user.toJSON() });
  } catch (err: unknown) {
    console.error('Profile update error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
