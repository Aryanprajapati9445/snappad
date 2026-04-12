import { Router } from 'express';
import { uploadFile, getSignedUrl } from '../controllers/upload.controller';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(protect);
router.post('/', upload.single('file'), uploadFile);
router.get('/signed-url', getSignedUrl);   // GET /api/upload/signed-url?key=...

export default router;
