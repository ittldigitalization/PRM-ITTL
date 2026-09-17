import express from 'express';
import { supabaseAdmin } from '../index';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

export const logAudit = async (
  userId: string | null,
  action: string,
  destination: string,
  targetRecord: string | null,
  oldVal: any,
  newVal: any,
  ip: string | null
) => {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action,
      destination,
      target_record: targetRecord,
      old_values: oldVal,
      new_values: newVal,
      ip_address: ip
    });
  } catch (err) {
    console.error('Failed to log audit event', err);
  }
};

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
