import express from 'express';
import { rbacService } from '../services/rbac';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = rbacService.getDestinations();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
