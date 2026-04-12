import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import xss from 'xss';
import Content from '../models/Content';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { extractMetadata } from '../services/metadata.service';
import { deleteFromS3, keyFromUrl } from '../services/s3.service';

const isUrl = (str: string): boolean => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidPublicUrl = (str: string): boolean => {
  try {
    const url = new URL(str);
    const hostname = url.hostname.toLowerCase();
    
    // Block private IP ranges and localhost
    const privatePatterns = [
      /^localhost$/,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];
    
    return !privatePatterns.some(pattern => pattern.test(hostname));
  } catch {
    return false;
  }
};

const sanitizeContent = (content: string): string => xss(content.trim());

const extractTags = (text: string, providedTags: string[] = []): string[] => {
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const extracted = [...(text.matchAll(hashtagRegex))].map((m) => m[1].toLowerCase());
  const combined = [...new Set([...providedTags.map((t) => t.toLowerCase()), ...extracted])];
  return combined.slice(0, 20);
};

export const createContent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    let { type, title, content, fileUrl, fileName, fileSize, fileMimeType, tags, metadata } = req.body;

    // Sanitize
    if (content) content = sanitizeContent(content);
    if (title) title = sanitizeContent(title);

    // Auto-fill title from filename if not provided (for images/files)
    if (!title && fileName && (type === 'image' || type === 'file')) {
      const extMatch = fileName.lastIndexOf('.');
      title = extMatch !== -1 ? fileName.slice(0, extMatch) : fileName;
    }

    // Auto-detect type if content is a URL
    if (content && isUrl(content) && type === 'text') {
      type = 'link';
    }

    // Extract tags from content
    const finalTags = extractTags(content || title || '', tags);

    // Fetch URL metadata
    if (type === 'link' && content && isUrl(content) && isValidPublicUrl(content) && !metadata?.title) {
      metadata = await extractMetadata(content);
    }

    const item = await Content.create({
      userId,
      type,
      title: title || metadata?.title,
      content,
      fileUrl,
      fileName,
      fileSize,
      fileMimeType,
      metadata,
      tags: finalTags,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const getContent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { q, type, tags, page = 1, limit = 20, sort = 'newest' } = req.query as any;

    const filter: mongoose.FilterQuery<typeof Content> = { userId };

    if (type) filter.type = type;
    if (tags) filter.tags = { $in: (tags as string).split(',').map((t: string) => t.trim()) };

    let query;
    if (q) {
      query = Content.find({ ...filter, $text: { $search: q } }, { score: { $meta: 'textScore' } }).sort({
        score: { $meta: 'textScore' },
      });
    } else {
      const sortMap: Record<string, any> = {
        newest: { isPinned: -1, createdAt: -1 },
        oldest: { isPinned: -1, createdAt: 1 },
        pinned: { isPinned: -1, createdAt: -1 },
      };
      query = Content.find(filter).sort(sortMap[sort] || sortMap.newest);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      query.skip(skip).limit(Number(limit)).lean(),
      Content.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
          hasNext: skip + items.length < total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateContent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      next(createError('Invalid content ID', 400));
      return;
    }

    const item = await Content.findOne({ _id: id, userId });
    if (!item) {
      next(createError('Content not found or unauthorized', 404));
      return;
    }

    const { title, content, tags, isPinned } = req.body;

    if (title !== undefined) item.title = sanitizeContent(title);
    if (content !== undefined) item.content = sanitizeContent(content);
    if (tags !== undefined) item.tags = tags.map((t: string) => t.toLowerCase());
    if (isPinned !== undefined) item.isPinned = isPinned;

    await item.save();
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const deleteContent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      next(createError('Invalid content ID', 400));
      return;
    }

    const item = await Content.findOneAndDelete({ _id: id, userId });
    if (!item) {
      next(createError('Content not found or unauthorized', 404));
      return;
    }

    // If the item had a file stored in S3, clean it up
    if (item.fileUrl) {
      const s3Key = keyFromUrl(item.fileUrl);
      if (s3Key) await deleteFromS3(s3Key);
    }

    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getTagCloud = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const tags = await Content.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
      { $project: { tag: '$_id', count: 1, _id: 0 } },
    ]);
    res.json({ success: true, data: tags });
  } catch (error) {
    next(error);
  }
};

/** POST /api/content/preview — fetch URL metadata WITHOUT saving to DB */
export const previewUrl = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      next(createError('URL is required', 400));
      return;
    }
    const metadata = await extractMetadata(url);
    res.json({ success: true, data: metadata });
  } catch (error) {
    next(error);
  }
};
