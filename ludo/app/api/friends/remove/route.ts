// ============================================================
// POST /api/friends/remove — Remove a friend
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import UserModel from '@/lib/models/user.model';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { userId, friendId } = await req.json();

    if (!userId || !friendId) {
      return NextResponse.json({ success: false, error: 'userId and friendId required' }, { status: 400 });
    }

    // Remove from both sides
    await UserModel.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await UserModel.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

    // Return updated user
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: user.toJSON() });
  } catch (err: unknown) {
    console.error('Remove friend error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
