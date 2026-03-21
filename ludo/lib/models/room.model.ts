// ============================================================
// Room Mongoose Model - Server-side room storage
// ============================================================

import mongoose, { Schema, Model } from 'mongoose';

export interface IRoom {
  _id: string; // room code (e.g. "RNK8LM")
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  players: {
    userId: string;
    nickname: string;
    slug: string;
    color: string;
    isReady: boolean;
    isHost: boolean;
    isOnline: boolean;
    isBot?: boolean;
  }[];
  maxPlayers: number;
  gameState: Record<string, unknown> | null; // serialized GameState
  settings: {
    allowBots: boolean;
    autoStart: boolean;
    turnTimeLimit: number;
  };
  createdAt: number;
}

const RoomPlayerSchema = new Schema(
  {
    userId: { type: String, required: true },
    nickname: { type: String, required: true },
    slug: { type: String, default: '' },
    color: { type: String, required: true },
    isReady: { type: Boolean, default: false },
    isHost: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: true },
    isBot: { type: Boolean, default: false },
  },
  { _id: false }
);

const RoomSchema = new Schema<IRoom>(
  {
    _id: { type: String, required: true }, // room code
    hostId: { type: String, required: true },
    status: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
    players: { type: [RoomPlayerSchema], default: [] },
    maxPlayers: { type: Number, default: 4 },
    gameState: { type: Schema.Types.Mixed, default: null },
    settings: {
      type: {
        allowBots: { type: Boolean, default: true },
        autoStart: { type: Boolean, default: false },
        turnTimeLimit: { type: Number, default: 30 },
      },
      default: () => ({ allowBots: true, autoStart: false, turnTimeLimit: 30 }),
    },
    createdAt: { type: Number, default: Date.now },
  },
  {
    _id: false,
    versionKey: false,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.code = ret._id;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// TTL: auto-delete rooms older than 2 hours
RoomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });

const RoomModel: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);

export default RoomModel;
