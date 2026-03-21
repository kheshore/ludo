// ============================================================
// POST /api/friends/accept — Accept a friend request
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

    const fromUser = await UserModel.findById(fromUserId);
    if (!fromUser) {
      return NextResponse.json({ success: false, error: 'Requesting user not found' }, { status: 404 });
    }

    // Update request status
    const reqIndex = user.friendRequests.findIndex(
      (r) => r.fromUserId === fromUserId && r.status === 'pending'
    );
    if (reqIndex === -1) {
      return NextResponse.json({ success: false, error: 'No pending request found' }, { status: 404 });
    }
    user.friendRequests[reqIndex].status = 'accepted';

    // Add each other as friends
    if (!user.friends.includes(fromUserId)) {
      user.friends.push(fromUserId);
    }
    if (!fromUser.friends.includes(userId)) {
      fromUser.friends.push(userId);
    }

    await user.save();
    await fromUser.save();

    return NextResponse.json({ success: true, user: user.toJSON() });
  } catch (err: unknown) {
    console.error('Accept friend error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
