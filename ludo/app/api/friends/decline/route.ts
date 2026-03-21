// ============================================================
// POST /api/friends/decline — Decline a friend request
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import UserModel from '@/lib/models/user.model';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { userId, fromUserId } = await req.json();

    if (!userId || !fromUserId) {
      return NextResponse.json({ success: false, error: 'userId and fromUserId required' }, { status: 400 });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Update request status
    const reqIndex = user.friendRequests.findIndex(
      (r) => r.fromUserId === fromUserId && r.status === 'pending'
    );
    if (reqIndex === -1) {
      return NextResponse.json({ success: false, error: 'No pending request found' }, { status: 404 });
    }
    user.friendRequests[reqIndex].status = 'declined';
    await user.save();

    return NextResponse.json({ success: true, user: user.toJSON() });
  } catch (err: unknown) {
    console.error('Decline friend error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
