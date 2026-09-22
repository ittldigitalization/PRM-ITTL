import cron from 'node-cron';
import { supabase } from '../index';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // assuming node-fetch is available, or we can use native fetch

dotenv.config();

// Send email using the Supabase Edge Function we deployed
const sendEmailAlert = async (to: string, subject: string, description: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-test-email', {
      body: { to, subject, description }
    });
    if (error) {
      console.error(`Failed to send email to ${to}:`, error.message);
    } else {
      console.log(`Successfully sent email alert to ${to}`);
    }
  } catch (err) {
    console.error(`Error invoking edge function for ${to}:`, err);
  }
};

const checkDeadlines = async () => {
  console.log('[CRON] Running deadline monitor...', new Date().toISOString());
  
  try {
    // 1. Calculate the target date (exactly 3 days from today)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    const targetDateStr = targetDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // Fetch all admins to notify them
    const { data: admins } = await supabase.from('users').select('email').eq('role', 'Admin');
    const adminEmails = admins?.map(a => a.email) || [];

    if (adminEmails.length === 0) {
      console.log('[CRON] No admins found to notify.');
      return;
    }

    // 2. Check Projects ending in exactly 3 days
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('end_date', targetDateStr)
      .neq('status', 'Completed');

    if (projects && projects.length > 0) {
      for (const project of projects) {
        const subject = `⚠️ Project Deadline Alert: ${project.name}`;
        const message = `The project "${project.name}" (Code: ${project.code}) is due in 3 days on ${project.end_date}. Current status is ${project.status}. Please take necessary actions.`;
        
        for (const email of adminEmails) {
          await sendEmailAlert(email, subject, message);
        }
      }
    }

    // 3. Check Milestones ending in exactly 3 days
    const { data: milestones } = await supabase
      .from('milestones')
      .select('*, projects(name)')
      .eq('end_date', targetDateStr)
      .neq('status', 'Completed');

    if (milestones && milestones.length > 0) {
      for (const milestone of milestones) {
        const projectName = (milestone.projects as any)?.name || 'Unknown Project';
        const subject = `⚠️ Milestone Deadline Alert: ${milestone.name}`;
        const message = `The milestone "${milestone.name}" for project "${projectName}" is due in 3 days on ${milestone.end_date}. Current status is ${milestone.status}.`;
        
        for (const email of adminEmails) {
          await sendEmailAlert(email, subject, message);
        }
      }
    }

    // 4. Check Tasks ending in exactly 3 days
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, projects(name)')
      .eq('end_date', targetDateStr)
      .neq('status', 'Completed');

    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        const projectName = (task.projects as any)?.name || 'Unknown Project';
        const subject = `⚠️ Task Deadline Alert: ${task.title}`;
        const message = `The task "${task.title}" for project "${projectName}" is due in 3 days on ${task.end_date}. Current status is ${task.status}. Assigned to: ${task.assigned_to || 'Unassigned'}.`;
        
        // Notify admins
        for (const email of adminEmails) {
          await sendEmailAlert(email, subject, message);
        }

        // If assigned_to is an email address, notify the assignee directly
        if (task.assigned_to && task.assigned_to.includes('@')) {
          await sendEmailAlert(task.assigned_to, subject, message);
        }
      }
    }
    
    console.log('[CRON] Deadline monitor completed successfully.');
  } catch (error) {
    console.error('[CRON] Error running deadline monitor:', error);
  }
};

export const startCronJobs = () => {
  console.log('Starting CRON jobs...');
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', () => {
    checkDeadlines();
  });

  // For testing purposes during deployment, we can also run it once immediately
  // setTimeout(() => checkDeadlines(), 5000);
};
