import express from 'express';
import { rbacService } from '../services/rbac';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await rbacService.getDestinations();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
});

export default router;
