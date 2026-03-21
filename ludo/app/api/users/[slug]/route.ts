// ============================================================
// GET /api/users/[slug] — Get user by slug (public profile)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import UserModel from '@/lib/models/user.model';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { slug } = await params;
    const user = await UserModel.findOne({ slug });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Return safe public data (strip passwordHash)
    const { passwordHash: _, ...userData } = user.toJSON();

    return NextResponse.json({ success: true, user: userData });
  } catch (err: unknown) {
    console.error('Get user by slug error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
