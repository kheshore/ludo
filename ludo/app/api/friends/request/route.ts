// ============================================================
// POST /api/friends/request — Send a friend request
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import UserModel from '@/lib/models/user.model';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { userId, targetSlug } = await req.json();

    if (!userId || !targetSlug) {
      return NextResponse.json({ success: false, error: 'userId and targetSlug required' }, { status: 400 });
    }

    const sender = await UserModel.findById(userId);
    if (!sender) {
      return NextResponse.json({ success: false, error: 'Sender not found' }, { status: 404 });
    }

    const target = await UserModel.findOne({ slug: targetSlug });
    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (target._id === sender._id) {
      return NextResponse.json({ success: false, error: "Can't add yourself" }, { status: 400 });
    }

    if (sender.friends.includes(target._id)) {
      return NextResponse.json({ success: false, error: 'Already friends' }, { status: 400 });
    }

    // Check if request already pending
    const existingRequest = target.friendRequests.find(
      (r) => r.fromUserId === sender._id && r.status === 'pending'
    );
    if (existingRequest) {
      return NextResponse.json({ success: false, error: 'Request already sent' }, { status: 400 });
    }

    // Add friend request to target
    target.friendRequests.push({
      fromUserId: sender._id,
      fromNickname: sender.nickname,
      fromSlug: sender.slug,
      timestamp: Date.now(),
      status: 'pending',
    });
    await target.save();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Friend request error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
