// ============================================================
// ChatMessage Mongoose Model
// Ephemeral: TTL index auto-deletes messages after 24 hours.
// Manual clear: deleteMany({ channelId }) when room dissolves.
// ============================================================

import mongoose, { Schema, Model } from 'mongoose';

export interface IChatMessage {
  _id: string;        // randomUUID
  channelId: string;  // roomCode or "uid1:uid2"
  scope: 'room' | 'dm';
  senderId: string;
  senderNickname: string;
  senderSlug: string;
  text: string;
  timestamp: number;  // ms since epoch
  createdAt: Date;    // used by TTL index
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    _id: { type: String, required: true },
    channelId: { type: String, required: true, index: true },
    scope: { type: String, enum: ['room', 'dm'], required: true },
    senderId: { type: String, required: true },
    senderNickname: { type: String, required: true },
    senderSlug: { type: String, default: '' },
    text: { type: String, required: true, maxlength: 500 },
    timestamp: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Auto-delete messages 24 h after creation
ChatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const ChatMessageModel: Model<IChatMessage> =
  mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export default ChatMessageModel;
