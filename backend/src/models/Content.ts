import mongoose, { Document, Schema } from 'mongoose';

export type ContentType = 'text' | 'link' | 'image' | 'file';

export interface IContentMetadata {
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
  favicon?: string;
}

export interface IContent extends Document {
  userId: mongoose.Types.ObjectId;
  type: ContentType;
  title?: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  metadata?: IContentMetadata;
  tags: string[];
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContentMetadataSchema = new Schema<IContentMetadata>(
  {
    title: String,
    description: String,
    image: String,
    domain: String,
    favicon: String,
  },
  { _id: false }
);

const ContentSchema = new Schema<IContent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'link', 'image', 'file'],
      required: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      maxlength: [50000, 'Content too large'],
    },
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    fileMimeType: String,
    metadata: ContentMetadataSchema,
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound indexes for performance
ContentSchema.index({ userId: 1, createdAt: -1 });
ContentSchema.index({ userId: 1, type: 1 });
ContentSchema.index({ userId: 1, tags: 1 });
ContentSchema.index({ userId: 1, isPinned: 1, createdAt: -1 });

// Full-text search index
ContentSchema.index(
  { title: 'text', content: 'text', 'metadata.title': 'text', 'metadata.description': 'text' },
  { weights: { title: 10, content: 5, 'metadata.title': 3, 'metadata.description': 1 } }
);

const Content = mongoose.model<IContent>('Content', ContentSchema);
export default Content;
