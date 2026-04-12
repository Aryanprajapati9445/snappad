import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { uploadToS3, getPresignedUrl } from '../services/s3.service';

export const uploadFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      next(createError('No file uploaded', 400));
      return;
    }

    const { buffer, mimetype, originalname, size } = req.file;
    const userId = req.user!.id;

    const result = await uploadToS3(buffer, userId, mimetype, originalname);

    res.status(201).json({
      success: true,
      data: {
        url: result.url,
        publicId: result.key,   // kept as "publicId" for API backwards-compat
        fileName: originalname,
        fileSize: size,
        fileMimeType: mimetype,
        resourceType: mimetype.startsWith('image/')
          ? 'image'
          : mimetype.startsWith('video/') || mimetype.startsWith('audio/')
            ? 'video'
            : 'raw',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/upload/signed-url?key=knowledge_vault%2F<userId>%2F<file>
 *
 * Returns a short-lived (1-hour) presigned S3 GET URL so the frontend
 * can view or download private S3 objects without making the bucket public.
 */
export const getSignedUrl = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const key = req.query.key as string | undefined;
    if (!key || typeof key !== 'string') {
      next(createError('Missing required query param: key', 400));
      return;
    }

    const downloadName = req.query.downloadName as string | undefined;

    // Security: only allow the authenticated user to request their own files
    const userId = req.user!.id;
    if (!key.startsWith(`knowledge_vault/${userId}/`)) {
      next(createError('Forbidden: you can only access your own files', 403));
      return;
    }

    const signedUrl = await getPresignedUrl(key, 43200, downloadName); // 12 hours for viewing, immediate for downloads
    res.json({ success: true, data: { url: signedUrl } });
  } catch (error) {
    next(error);
  }
};
