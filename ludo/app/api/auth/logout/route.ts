// ============================================================
// POST /api/auth/logout — Set user offline
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import UserModel from '@/lib/models/user.model';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    await UserModel.findByIdAndUpdate(userId, { isOnline: false, lastSeen: Date.now() });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Logout error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
