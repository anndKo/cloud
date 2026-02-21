export interface User {
  id: string;
  displayName: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  type: 'text' | 'file' | 'image' | 'video';
  file?: FileAttachment;
  isDeleted?: boolean;
  deletedFor?: 'me' | 'everyone';
  expiresAt?: Date;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadProgress?: number;
  encrypted: boolean;
}

export interface Chat {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isTyping: boolean;
  isEncrypted: boolean;
  createdAt: Date;
}
