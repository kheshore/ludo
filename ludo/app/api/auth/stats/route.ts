// ============================================================
// PATCH /api/auth/stats — Update user game stats
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import UserModel from '@/lib/models/user.model';

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const { userId, stats } = await req.json();

    if (!userId || !stats) {
      return NextResponse.json({ success: false, error: 'userId and stats required' }, { status: 400 });
    }

    // Build $set object for nested stats fields
    const setObj: Record<string, number> = {};
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'number') {
        setObj[`stats.${key}`] = value;
      }
    }

    const user = await UserModel.findByIdAndUpdate(userId, { $set: setObj }, { new: true });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: user.toJSON() });
  } catch (err: unknown) {
    console.error('Stats update error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
