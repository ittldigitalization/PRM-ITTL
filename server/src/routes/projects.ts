import express from 'express';
import { supabaseAdmin } from '../index';

const router = express.Router();

// GET /api/projects/overall
// Returns an overall project CRM view: Projects with their milestones, tasks, and billing data
router.get('/overall', async (req, res) => {
  try {
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectsError) throw projectsError;

    const { data: milestones, error: milestonesError } = await supabaseAdmin
      .from('milestones')
      .select('*');

    if (milestonesError) throw milestonesError;

    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('*');

    if (tasksError) throw tasksError;
    
    const { data: billings, error: billingsError } = await supabaseAdmin
      .from('billings')
      .select('project_id, invoice_amount');
      
    if (billingsError) throw billingsError;

    // Aggregate data per project
    const aggregatedData = projects.map(project => {
      const projectMilestones = milestones.filter(m => m.project_id === project.id);
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      
      const actualCost = billings
        .filter(b => b.project_id === project.id)
        .reduce((sum, b) => sum + (Number(b.invoice_amount) || 0), 0);

      // Compute simple progress based on milestones (if any exist)
      let progress = 0;
      if (projectMilestones.length > 0) {
        const completedMilestones = projectMilestones.filter(m => m.status === 'Completed').length;
        progress = Math.round((completedMilestones / projectMilestones.length) * 100);
      }

      return {
        ...project,
        actual_cost: actualCost,
        progress,
        milestones: projectMilestones,
        tasks: projectTasks
      };
    });

    res.json({
      success: true,
      count: aggregatedData.length,
      data: aggregatedData
    });
  } catch (error: any) {
    console.error('Error fetching overall projects:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
