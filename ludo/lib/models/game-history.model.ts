// ============================================================
// GameHistory Mongoose Model - Stores completed game records
// ============================================================

import mongoose, { Schema, Model } from 'mongoose';

export interface IGameHistoryPlayer {
  userId: string;
  nickname: string;
  slug: string;
  color: string;
  isBot: boolean;
  finishOrder: number; // 1-4
}

export interface IGameHistory {
  _id: string; // auto ObjectId
  roomCode: string;
  players: IGameHistoryPlayer[];
  playerCount: number;
  startedAt: number;
  endedAt: number;
  duration: number; // seconds
}

const GameHistoryPlayerSchema = new Schema(
  {
    userId: { type: String, required: true },
    nickname: { type: String, required: true },
    slug: { type: String, default: '' },
    color: { type: String, required: true },
    isBot: { type: Boolean, default: false },
    finishOrder: { type: Number, required: true },
  },
  { _id: false }
);

const GameHistorySchema = new Schema<IGameHistory>(
  {
    roomCode: { type: String, default: '' },
    players: { type: [GameHistoryPlayerSchema], default: [] },
    playerCount: { type: Number, default: 2 },
    startedAt: { type: Number, default: Date.now },
    endedAt: { type: Number, default: Date.now },
    duration: { type: Number, default: 0 },
  },
  {
    versionKey: false,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Index for querying by player userId
GameHistorySchema.index({ 'players.userId': 1, endedAt: -1 });

const GameHistoryModel: Model<IGameHistory> =
  mongoose.models.GameHistory || mongoose.model<IGameHistory>('GameHistory', GameHistorySchema);

export default GameHistoryModel;
