// ============================================================
// User Mongoose Model
// ============================================================

import mongoose, { Schema, Model } from 'mongoose';

// --- Sub-schemas ---

const UserStatsSchema = new Schema(
  {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    gamesLost: { type: Number, default: 0 },
    totalPiecesMoved: { type: Number, default: 0 },
    totalCaptures: { type: Number, default: 0 },
    totalSixes: { type: Number, default: 0 },
    winStreak: { type: Number, default: 0 },
    bestWinStreak: { type: Number, default: 0 },
    averageGameDuration: { type: Number, default: 0 },
    firstPlaceFinishes: { type: Number, default: 0 },
    secondPlaceFinishes: { type: Number, default: 0 },
    thirdPlaceFinishes: { type: Number, default: 0 },
    fourthPlaceFinishes: { type: Number, default: 0 },
  },
  { _id: false }
);

const FriendRequestSchema = new Schema(
  {
    fromUserId: { type: String, required: true },
    fromNickname: { type: String, required: true },
    fromSlug: { type: String, required: true },
    timestamp: { type: Number, default: Date.now },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  },
  { _id: false }
);

// --- Main User schema ---

export interface IUser {
  _id: string; // We use our own string IDs
  slug: string;
  username: string;
  nickname: string;
  passwordHash: string;
  avatar: string;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    totalPiecesMoved: number;
    totalCaptures: number;
    totalSixes: number;
    winStreak: number;
    bestWinStreak: number;
    averageGameDuration: number;
    firstPlaceFinishes: number;
    secondPlaceFinishes: number;
    thirdPlaceFinishes: number;
    fourthPlaceFinishes: number;
  };
  friends: string[];
  friendRequests: {
    fromUserId: string;
    fromNickname: string;
    fromSlug: string;
    timestamp: number;
    status: 'pending' | 'accepted' | 'declined';
  }[];
  createdAt: number;
  lastSeen: number;
  isOnline: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true }, // uuid
    slug: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    nickname: { type: String, required: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: '🎲' },
    stats: { type: UserStatsSchema, default: () => ({}) },
    friends: { type: [String], default: [] },
    friendRequests: { type: [FriendRequestSchema], default: [] },
    createdAt: { type: Number, default: Date.now },
    lastSeen: { type: Number, default: Date.now },
    isOnline: { type: Boolean, default: false },
  },
  {
    _id: false, // We manage _id ourselves
    versionKey: false,
    toJSON: {
      // Map _id → id for frontend compatibility
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Case-insensitive unique index on username
UserSchema.index({ username: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

// Prevent model recompilation in Next.js HMR
const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default UserModel;
