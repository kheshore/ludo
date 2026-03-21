// ============================================================
// GET /api/users/id/[id] — Get user by ID
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import UserModel from '@/lib/models/user.model';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const user = await UserModel.findById(id);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Strip passwordHash for safety
    const { passwordHash: _, ...userData } = user.toJSON();

    return NextResponse.json({ success: true, user: userData });
  } catch (err: unknown) {
    console.error('Get user by id error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
