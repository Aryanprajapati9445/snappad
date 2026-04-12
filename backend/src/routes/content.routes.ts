import { Router } from 'express';
import {
  createContent,
  getContent,
  updateContent,
  deleteContent,
  getTagCloud,
  previewUrl,
} from '../controllers/content.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createContentSchema, updateContentSchema, searchQuerySchema } from '../utils/schemas';

const router = Router();

router.use(protect);

// /tags and /preview must be registered before /:id to prevent Express matching them as Mongo ObjectIds
router.get('/tags', getTagCloud);
router.post('/preview', previewUrl);

router.post('/', validate(createContentSchema), createContent);
router.get('/', validate(searchQuerySchema, 'query'), getContent);
router.put('/:id', validate(updateContentSchema), updateContent);
router.delete('/:id', deleteContent);

export default router;
