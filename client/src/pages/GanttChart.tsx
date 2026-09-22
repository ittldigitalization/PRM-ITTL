import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Gantt, ViewMode, type Task } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

type Tab = 'team' | 'individual';

/* ── Smart Duration Formatter ──────────────────────────────────── */
const formatDuration = (totalDays: number): string => {
  if (totalDays <= 0) return '0d';

  const years = Math.floor(totalDays / 365);
  let remaining = totalDays % 365;
  const months = Math.floor(remaining / 30);
  remaining = remaining % 30;
  const weeks = Math.floor(remaining / 7);
  const days = remaining % 7;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);

  return parts.join(' ') || '0d';
};

/* ── Tree Connector Helper ─────────────────────────────────────── */
const getTreeInfo = (task: Task, allTasks: Task[]) => {
  const isProject = task.id.startsWith('p-');
  const isMilestone = task.id.startsWith('m-');
  const isTask = task.id.startsWith('t-');

  if (isProject) {
    return { depth: 0, connectors: [] as string[] };
  }

  // Find siblings (items sharing the same parent)
  const parentId = (task as any).project;
  const siblings = allTasks.filter(t => (t as any).project === parentId);
  const isLast = siblings.indexOf(task) === siblings.length - 1;

  if (isMilestone) {
    return {
      depth: 1,
      connectors: [isLast ? '└── ' : '├── '],
      isLast,
      parentId,
    };
  }

  if (isTask) {
    // Task is depth 2 — need connector for its parent milestone AND for itself
    const milestoneParentId = parentId; // e.g. "m-xxx"
    const milestoneTask = allTasks.find(t => t.id === milestoneParentId);
    const grandParentId = milestoneTask ? (milestoneTask as any).project : null;

    // Is the parent milestone the last among its siblings?
    const milestoneSiblings = allTasks.filter(t => (t as any).project === grandParentId);
    const isMilestoneLast = milestoneTask ? milestoneSiblings.indexOf(milestoneTask) === milestoneSiblings.length - 1 : false;

    // First connector: continuing line from grandparent (project → milestone level)
    const firstConnector = isMilestoneLast ? '    ' : '│   ';
    // Second connector: branch from milestone to task
    const secondConnector = isLast ? '└── ' : '├── ';

    return {
      depth: 2,
      connectors: [firstConnector, secondConnector],
      isLast,
      parentId,
    };
  }

  return { depth: 0, connectors: [] as string[] };
};

/* ── Custom Task List Header ───────────────────────────────────── */
const CustomTaskListHeader: React.FC<{ headerHeight: number; rowWidth: string; fontFamily: string; fontSize: string }> = ({ headerHeight, fontFamily, fontSize }) => {
  return (
    <div style={{ display: 'flex', height: headerHeight, fontFamily, fontSize, borderBottom: '1px solid var(--border)', background: 'var(--muted)', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', alignItems: 'center' }}>
      <div style={{ flex: 1, minWidth: '200px', padding: '0 10px', display: 'flex', alignItems: 'center', fontSize: '12px', height: '100%' }}>Name</div>
      <div style={{ width: '80px', padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', height: '100%' }}>From</div>
      <div style={{ width: '80px', padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', height: '100%' }}>To</div>
      <div style={{ width: '80px', padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', height: '100%' }}>Status</div>
      <div style={{ width: '100px', padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', height: '100%' }}>Duration</div>
    </div>
  );
};

/* ── Custom Task List Table (Tree Layout) ──────────────────────── */
const CustomTaskListTable: React.FC<{
  rowHeight: number; rowWidth: string; fontFamily: string; fontSize: string; locale: string; tasks: Task[]; selectedTaskId: string; setSelectedTask: (taskId: string) => void; onExpanderClick: (task: Task) => void;
}> = ({ rowHeight, fontFamily, tasks, selectedTaskId, setSelectedTask, onExpanderClick }) => {

  const connectorColor = '#cbd5e1'; // subtle slate-300

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {tasks.map(t => {
        const durationMs = t.end.getTime() - t.start.getTime();
        const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
        const durationStr = formatDuration(durationDays);
        const treeInfo = getTreeInfo(t, tasks);

        const isProject = t.id.startsWith('p-');
        const isMilestone = t.id.startsWith('m-');
        const isTaskItem = t.id.startsWith('t-');

        // Build expander
        let expander = null;
        if (isProject || isMilestone) {
          expander = (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '18px', height: '18px', fontSize: '9px', cursor: 'pointer',
                marginRight: '6px', borderRadius: '3px', flexShrink: 0,
                background: isProject ? 'var(--primary)' : 'var(--muted)',
                color: isProject ? '#fff' : 'var(--foreground)',
                transition: 'background 0.15s',
              }}
              onClick={(e) => { e.stopPropagation(); onExpanderClick(t); }}
            >
              {t.hideChildren ? '▶' : '▼'}
            </span>
          );
        }

        // Row background for different levels
        const rowBg = t.id === selectedTaskId
          ? 'var(--muted)'
          : isProject
            ? 'rgba(var(--primary-rgb, 99, 102, 241), 0.03)'
            : 'transparent';

        // Font weight
        const nameWeight = isProject ? 700 : isMilestone ? 600 : 400;
        const nameSize = isProject ? '14px' : isMilestone ? '13px' : '12.5px';

        return (
          <div
            key={t.id}
            style={{
              display: 'flex', height: rowHeight, fontFamily,
              borderBottom: '1px solid var(--border)',
              background: rowBg,
              color: 'var(--foreground)',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onClick={() => setSelectedTask(t.id)}
          >
            {/* NAME column with tree connectors */}
            <div style={{
              flex: 1, minWidth: '200px', padding: '0 10px',
              display: 'flex', alignItems: 'center',
              overflow: 'hidden', whiteSpace: 'nowrap', height: '100%',
            }}>
              {/* Tree connector lines */}
              {treeInfo.connectors.map((connector, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-block',
                    width: '24px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: connectorColor,
                    flexShrink: 0,
                    userSelect: 'none',
                    lineHeight: `${rowHeight}px`,
                  }}
                >
                  {connector}
                </span>
              ))}

              {/* Expander or spacer for tasks */}
              {expander}
              {isTaskItem && <span style={{ display: 'inline-block', width: '6px', flexShrink: 0 }} />}

              {/* Name text */}
              <span
                style={{
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', fontSize: nameSize,
                  fontWeight: nameWeight,
                }}
                title={t.name}
              >
                {t.name}
              </span>
            </div>

            {/* FROM column */}
            <div style={{
              width: '80px', padding: '0 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11.5px', height: '100%', flexShrink: 0,
            }}>
              {t.start.toLocaleDateString('en-GB')}
            </div>

            {/* TO column */}
            <div style={{
              width: '80px', padding: '0 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11.5px', height: '100%', flexShrink: 0,
            }}>
              {t.end.toLocaleDateString('en-GB')}
            </div>

            {/* STATUS column */}
            <div style={{
              width: '80px', padding: '0 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', height: '100%', flexShrink: 0,
            }}>
              <span style={{
                padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600,
                whiteSpace: 'nowrap',
                backgroundColor: t.styles?.backgroundColor ? `${t.styles.backgroundColor}20` : 'var(--muted)',
                color: t.styles?.backgroundColor || 'var(--muted-foreground)',
              }}>
                {(t as any).statusStr || '-'}
              </span>
            </div>

            {/* DURATION column */}
            <div style={{
              width: '100px', padding: '0 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11.5px', fontWeight: 700, height: '100%', flexShrink: 0,
            }}>
              {durationStr}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Custom Tooltip ────────────────────────────────────────────── */
const CustomTooltip: React.FC<{ task: Task; fontSize: string; fontFamily: string }> = ({ task, fontSize, fontFamily }) => {
  const durationMs = task.end.getTime() - task.start.getTime();
  const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
  const durationStr = formatDuration(durationDays);
  return (
    <div style={{ padding: '12px', background: 'var(--card)', border: `2px solid ${task.styles?.backgroundColor || 'var(--border)'}`, borderRadius: '8px', boxShadow: 'var(--shadow-md)', fontFamily, fontSize }}>
      <b style={{ fontSize: '14px', display: 'block', marginBottom: '4px', color: task.styles?.backgroundColor || 'var(--foreground)' }}>{task.name}</b>
      <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>Start: {task.start.toLocaleDateString('en-GB')}</div>
      <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>End: {task.end.toLocaleDateString('en-GB')}</div>
      <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px', color: task.styles?.backgroundColor || 'var(--foreground)' }}>
        Duration: {durationStr}
      </div>
    </div>
  );
};

export default function GanttChart() {
  const [activeTab, setActiveTab] = useState<Tab>('individual');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [projectsList, setProjectsList] = useState<any[]>([]);

  const getColor = (status: string) => {
    if (status === 'On Hold' || status === 'Hold') return '#facc15'; // Yellow
    if (status === 'Completed') return '#166534'; // Dark Green
    if (status === 'In Progress') return '#9d174d'; // Pink Dark
    if (status === 'Started') return '#1e3a8a'; // Navy Blue
    return '#94a3b8'; // Grey (Not Started)
  };

  const getValidDate = (...dateStrs: (string | null | undefined)[]) => {
    for (const d of dateStrs) {
      if (d && d.trim() !== '') {
        const date = new Date(d);
        if (!isNaN(date.getTime())) return date;
      }
    }
    return new Date();
  };

  const getSafeDates = (actualStart: any, start: any, plannedStart: any, actualEnd: any, end: any, plannedEnd: any) => {
    let startDate = getValidDate(actualStart, start, plannedStart);
    let endDate = getValidDate(actualEnd, end, plannedEnd);
    
    // Ensure end is strictly after start for Gantt chart component to work properly
    if (endDate.getTime() <= startDate.getTime()) {
      endDate = new Date(startDate.getTime());
      endDate.setDate(endDate.getDate() + 1);
    }
    
    return { start: startDate, end: endDate };
  };

  const fetchData = async () => {
    try {

      const [projectsRes, milestonesRes, tasksRes] = await Promise.all([
        supabase.from('projects').select('*').order('start_date', { ascending: true }),
        supabase.from('milestones').select('*').order('start_date', { ascending: true }),
        supabase.from('tasks').select('*').order('start_date', { ascending: true })
      ]);

      const projects = projectsRes.data || [];
      const milestones = milestonesRes.data || [];
      const tasksData = tasksRes.data || [];
      setProjectsList(projects);

      let formattedTasks: Task[] = [];
      let individualTasks: Task[] = [];

      projects.forEach((p) => {
        const pTasks = tasksData.filter(t => t.project_id === p.id);
        
        const isExternalProject = p.type === 'External project';
        const isInternalProject = !isExternalProject;

        // const isProjectActual = !!(p.actual_start_date || p.actual_end_date);
        const { start: pStart, end: pEnd } = getSafeDates(
          p.actual_start_date, p.start_date, p.planned_start_date, 
          p.actual_end_date, p.end_date, p.planned_end_date
        );

        const projectTask: Task = {
          id: `p-${p.id}`,
          name: `${p.name} - ${p.progress || 0}%`,
          type: 'project',
          start: pStart,
          end: pEnd,
          progress: p.progress || 0,
          isDisabled: true,
          hideChildren: true,
          styles: { 
            progressColor: getColor(p.status), 
            progressSelectedColor: getColor(p.status),
            backgroundColor: getColor(p.status)
          },
          statusStr: p.status
        } as any;

        if (isExternalProject) formattedTasks.push(projectTask);
        if (isInternalProject) individualTasks.push(projectTask);

        const pMilestones = milestones.filter(m => m.project_id === p.id);
        const pTasksNoMilestone = pTasks.filter(t => !t.milestone_id);

        pMilestones.forEach(m => {
          const { start: mStart, end: mEnd } = getSafeDates(
            m.actual_start_date, m.start_date, m.planned_start_date, 
            m.actual_end_date, m.end_date, m.planned_end_date
          );

          const milestoneTask: Task = {
             id: `m-${m.id}`,
             name: `${m.name} - ${m.progress || 0}%`,
             type: 'project',
             start: mStart,
             end: mEnd,
             progress: m.progress || 0,
             isDisabled: true,
             hideChildren: true,
             styles: { 
               progressColor: getColor(m.status), 
               progressSelectedColor: getColor(m.status),
               backgroundColor: getColor(m.status)
             },
             project: `p-${p.id}`,
             statusStr: m.status
          } as any;

          if (isExternalProject) formattedTasks.push(milestoneTask);
          if (isInternalProject) individualTasks.push(milestoneTask);

          // Find tasks that belong to this milestone
          const mTasks = pTasks.filter(t => t.milestone_id === m.id);
          mTasks.forEach(t => {
            const { start: tStart, end: tEnd } = getSafeDates(
              t.actual_start_date, t.start_date, t.planned_start_date, 
              t.actual_end_date, t.end_date, t.planned_end_date
            );

            const taskObj: Task = {
               id: `t-${t.id}`,
               name: `${t.title} - ${t.progress || 0}%`,
               type: 'task',
               start: tStart,
               end: tEnd,
               progress: t.progress || 0,
               isDisabled: true,
               styles: { 
                 progressColor: getColor(t.status), 
                 progressSelectedColor: getColor(t.status),
                 backgroundColor: getColor(t.status)
               },
               project: `m-${m.id}`,
               statusStr: t.status
            } as any;
            
            if (isExternalProject) formattedTasks.push(taskObj);
            if (isInternalProject) individualTasks.push(taskObj);
          });
        });

        // Add tasks that have NO milestone, directly under the project
        pTasksNoMilestone.forEach(t => {
          const { start: tStart, end: tEnd } = getSafeDates(
            t.actual_start_date, t.start_date, t.planned_start_date, 
            t.actual_end_date, t.end_date, t.planned_end_date
          );

          const taskObj: Task = {
             id: `t-${t.id}`,
             name: `${t.title} - ${t.progress || 0}%`,
             type: 'task',
             start: tStart,
             end: tEnd,
             progress: t.progress || 0,
             isDisabled: true,
             styles: { 
               progressColor: getColor(t.status), 
               progressSelectedColor: getColor(t.status),
               backgroundColor: getColor(t.status)
             },
             project: `p-${p.id}`,
             statusStr: t.status
          } as any;
          
          if (isExternalProject) formattedTasks.push(taskObj);
          if (isInternalProject) individualTasks.push(taskObj);
        });
      });
      
      // Save all tasks in state, we'll filter them during render based on the active tab
      // Preserve existing expanded/collapsed state if the task is already loaded
      setTasks(prevTasks => {
         const newTasks = activeTab === 'team' ? formattedTasks : individualTasks;
         return newTasks.map(nt => {
            const prev = prevTasks.find(pt => pt.id === nt.id);
            if (prev && prev.hideChildren !== undefined) {
               return { ...nt, hideChildren: prev.hideChildren };
            }
            return nt;
         });
      });
      
    } catch (error) {
      console.error('Error fetching Gantt data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setProjectFilter('All');
    fetchData();

    const handleDbChange = (payload: any, table: string) => {
      if (payload.eventType === 'DELETE') {
         setTasks(prev => prev.filter(t => t.id !== `${table.charAt(0)}-${payload.old.id}`));
         return;
      }
      setTasks(prevTasks => {
        const updated = payload.new;
        return prevTasks.map(t => {
          let prefix = table === 'projects' ? 'p-' : table === 'milestones' ? 'm-' : 't-';
          if (t.id === `${prefix}${updated.id}`) {
            const { start, end } = getSafeDates(updated.actual_start_date, updated.start_date, updated.planned_start_date, updated.actual_end_date, updated.end_date, updated.planned_end_date);
            const newName = `${updated.name || updated.title} - ${updated.progress || 0}%`;
            return {
               ...t,
               name: newName,
               start,
               end,
               progress: updated.progress || 0,
               statusStr: updated.status,
               styles: {
                 progressColor: getColor(updated.status),
                 progressSelectedColor: getColor(updated.status),
                 backgroundColor: getColor(updated.status)
               }
            };
          }
          return t;
        });
      });
    };

    const subProjects = supabase.channel('gantt_projects').on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (p) => handleDbChange(p, 'projects')).subscribe();
    const subMilestones = supabase.channel('gantt_milestones').on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, (p) => handleDbChange(p, 'milestones')).subscribe();
    const subTasks = supabase.channel('gantt_tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (p) => handleDbChange(p, 'tasks')).subscribe();

    return () => {
      supabase.removeChannel(subProjects);
      supabase.removeChannel(subMilestones);
      supabase.removeChannel(subTasks);
    };
  }, [activeTab]);

  const handleExpanderClick = (task: Task) => {
    setTasks(tasks.map(t => (t.id === task.id ? task : t)));
  };

  const handleDateChange = async (task: Task) => {
    try {
      // task.id is 'p-uuid', 'm-uuid', or 't-uuid'
      const idPrefix = task.id.substring(0, 2);
      const uuid = task.id.substring(2);
      
      const startDateStr = task.start.toISOString().split('T')[0];
      const endDateStr = task.end.toISOString().split('T')[0];
      
      let table = '';
      if (idPrefix === 'p-') table = 'projects';
      else if (idPrefix === 'm-') table = 'milestones';
      else if (idPrefix === 't-') table = 'tasks';
      
      if (table) {
         // Optimistically update the UI
         setTasks(tasks.map(t => (t.id === task.id ? task : t)));
         
         const { error } = await supabase.from(table).update({
           start_date: startDateStr,
           end_date: endDateStr,
           planned_start_date: startDateStr,
           planned_end_date: endDateStr
         }).eq('id', uuid);
         
         if (error) {
            console.error('Error updating task in db:', error);
            fetchData(); // revert
         }
      }
    } catch (err) {
      console.error(err);
      fetchData(); // revert
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div className="flex gap-4">
          <button
            className={`pb-2 ${activeTab === 'individual' ? 'font-bold text-primary border-b-2' : 'text-muted'}`}
            style={{ borderBottomColor: activeTab === 'individual' ? 'var(--primary)' : 'transparent', borderBottomStyle: 'solid', borderBottomWidth: '2px', paddingBottom: '0.5rem' }}
            onClick={() => setActiveTab('individual')}
          >
            Internal Team Gantt Chart
          </button>
          <button
            className={`pb-2 ${activeTab === 'team' ? 'font-bold text-primary border-b-2' : 'text-muted'}`}
            style={{ borderBottomColor: activeTab === 'team' ? 'var(--primary)' : 'transparent', borderBottomStyle: 'solid', borderBottomWidth: '2px', paddingBottom: '0.5rem' }}
            onClick={() => setActiveTab('team')}
          >
            External Team Gantt Chart
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            className="form-input" 
            style={{ width: '200px', padding: '0.2rem 0.5rem', height: '36px', fontSize: '0.875rem' }}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="All">All Projects</option>
            {projectsList.filter(p => activeTab === 'team' ? p.type === 'External project' : p.type !== 'External project').map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="w-64 relative">
             <input 
               type="text" 
               className="form-input w-full" 
               placeholder="Search projects..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               style={{ paddingLeft: '1rem', height: '36px', fontSize: '0.875rem' }}
             />
          </div>

          <div className="flex gap-2">
            <button className={`btn btn-sm ${viewMode === ViewMode.Day ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewMode(ViewMode.Day)}>Day</button>
            <button className={`btn btn-sm ${viewMode === ViewMode.Week ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewMode(ViewMode.Week)}>Week</button>
            <button className={`btn btn-sm ${viewMode === ViewMode.Month ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewMode(ViewMode.Month)}>Month</button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button 
          className="btn btn-primary"
          onClick={() => window.history.back()}
          style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'var(--primary)', color: 'white' }}
        >
          Back
        </button>
      </div>

      <div className="card p-4 overflow-hidden">
        {loading ? (
           <div className="p-8 text-center text-muted-foreground">Loading Professional Gantt Chart...</div>
        ) : tasks.length > 0 ? (() => {
          
          let filteredTasks = tasks;
          if (projectFilter !== 'All') {
             filteredTasks = filteredTasks.filter(t => {
                 if (t.id === `p-${projectFilter}`) return true;
                 if (t.id.startsWith('m-')) return t.project === `p-${projectFilter}`;
                 if (t.id.startsWith('t-')) {
                     if (t.project === `p-${projectFilter}`) return true;
                     if (t.project?.startsWith('m-')) {
                         const parentMilestone = tasks.find(m => m.id === t.project);
                         return parentMilestone && parentMilestone.project === `p-${projectFilter}`;
                     }
                 }
                 return false;
             });
          }

          if (searchQuery.trim() !== '') {
             const lowerQuery = searchQuery.toLowerCase();
             const matchingProjectIds = new Set(tasks.filter(t => t.id.startsWith('p-') && t.name.toLowerCase().includes(lowerQuery)).map(t => t.id));
             filteredTasks = tasks.filter(t => {
                 if (t.id.startsWith('p-')) return matchingProjectIds.has(t.id);
                 if (t.id.startsWith('m-')) return matchingProjectIds.has(t.project || '');
                 if (t.id.startsWith('t-')) {
                     if ((t.project || '').startsWith('p-')) return matchingProjectIds.has(t.project || '');
                     if ((t.project || '').startsWith('m-')) {
                         const parentMilestone = tasks.find(m => m.id === t.project);
                         return parentMilestone && matchingProjectIds.has(parentMilestone.project || '');
                     }
                 }
                 return false;
             });
          }

          if (filteredTasks.length === 0) {
             return <div className="p-8 text-center text-muted-foreground">No projects match your search.</div>;
          }

          return (
          <div style={{ overflowX: 'auto' }}>
            <Gantt 
              tasks={filteredTasks} 
              viewMode={viewMode}
              onExpanderClick={handleExpanderClick}
              onDateChange={handleDateChange}
              listCellWidth="440px"
              columnWidth={viewMode === ViewMode.Month ? 150 : viewMode === ViewMode.Week ? 100 : 60}
              TaskListHeader={CustomTaskListHeader}
              TaskListTable={CustomTaskListTable}
              TooltipContent={CustomTooltip}
            />
          </div>
          );
        })() : (
           <div className="p-8 text-center text-muted-foreground">No data available to display in Gantt Chart. Add a project to get started.</div>
        )}
      </div>
      
      <div className="flex flex-col gap-2 mt-2 text-sm text-muted">
        <div className="flex gap-4">
          <div className="font-medium mr-2">Legend:</div>
          <div className="flex items-center gap-2"><span style={{ width: '12px', height: '12px', backgroundColor: '#94a3b8', borderRadius: '2px' }}></span> Not Started</div>
          <div className="flex items-center gap-2"><span style={{ width: '12px', height: '12px', backgroundColor: '#1e3a8a', borderRadius: '2px' }}></span> Started</div>
          <div className="flex items-center gap-2"><span style={{ width: '12px', height: '12px', backgroundColor: '#9d174d', borderRadius: '2px' }}></span> In Progress</div>
          <div className="flex items-center gap-2"><span style={{ width: '12px', height: '12px', backgroundColor: '#166534', borderRadius: '2px' }}></span> Completed</div>
          <div className="flex items-center gap-2"><span style={{ width: '12px', height: '12px', backgroundColor: '#facc15', borderRadius: '2px' }}></span> Hold</div>
        </div>
      </div>
    </div>
  );
}
