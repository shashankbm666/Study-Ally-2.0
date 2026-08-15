/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Subject, Task, SemesterItem } from "../types";

/**
 * Calculates current days remaining from today till ISO date string
 */
export function getDaysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return isNaN(diffDays) ? null : diffDays;
}

/**
 * Computes an priority/urgency score for subjects between 0 and 100.
 * Priority rises as the exam date approaches and completed units fall behind.
 */
export function calculateSubjectPriority(subject: Subject): number {
  const remaining = Math.max(0, subject.totalUnits - subject.completedUnits);
  if (remaining === 0) return 0; // Completed, no direct active priority

  const daysLeft = getDaysRemaining(subject.examDate);
  const completionRatio = subject.totalUnits > 0 ? subject.completedUnits / subject.totalUnits : 0;
  
  let examUrgencyFactor = 0;
  if (daysLeft !== null) {
    if (daysLeft <= 0) examUrgencyFactor = 1.0; // Overdue/on exam day
    else if (daysLeft <= 3) examUrgencyFactor = 0.9;
    else if (daysLeft <= 7) examUrgencyFactor = 0.7;
    else if (daysLeft <= 14) examUrgencyFactor = 0.5;
    else if (daysLeft <= 30) examUrgencyFactor = 0.3;
    else examUrgencyFactor = 0.1;
  }

  const weaknessFactor = subject.weak ? 0.25 : 0.0;
  const nonCompletionFactor = (1 - completionRatio) * 0.55;
  const biasFactor = (subject.difficultyBias + 3) / 6 * 0.1; // scale -3..3 to 0..0.1

  // Final prioritized score on scale of 0..100
  const score = (examUrgencyFactor * 0.3 + nonCompletionFactor + weaknessFactor + biasFactor) * 100;
  return Math.min(100, Math.max(0, score));
}

/**
 * Generates structured, realistic learning targets for today based on remaining workload
 */
export function generateSmartLocalSchedule(
  subjects: Subject[],
  semesters: SemesterItem[],
  availableHours: number,
  focusPreference: 'morning' | 'afternoon' | 'night'
): Task[] {
  if (subjects.length === 0) {
    return [
      {
        id: "l-task-gen-1",
        text: "Add some subjects above to generate your customized study schedule",
        completed: false,
        type: "Onboarding",
        badge: "Small win",
        subjectName: "General"
      },
      {
        id: "l-task-gen-2",
        text: "Plan out assignments in the Semesters portal to track due dates",
        completed: false,
        type: "Planning",
        badge: "Small win",
        subjectName: "General"
      }
    ];
  }

  // Calculate subject priorities
  const activeSubjects = subjects.map(s => ({
    subj: s,
    priority: calculateSubjectPriority(s),
    daysRemaining: getDaysRemaining(s.examDate)
  })).filter(item => item.subj.totalUnits > item.subj.completedUnits)
    .sort((a, b) => b.priority - a.priority);

  const tasks: Task[] = [];

  // Check for highly urgent semesters (deadlines <= 3 days)
  const urgentAssignments = semesters
    .filter(sem => !sem.completed && sem.priority === 'High')
    .map(sem => ({ sem, daysLeft: getDaysRemaining(sem.deadline) }))
    .filter(item => item.daysLeft !== null && item.daysLeft <= 3)
    .sort((a, b) => (a.daysLeft || 0) - (b.daysLeft || 0));

  // 1. Add Urgent Semester Deliverable tasks
  urgentAssignments.slice(0, 2).forEach(item => {
    const sName = item.sem.subjectName;
    tasks.push({
      id: `l-task-sem-${item.sem.id}`,
      subjectId: item.sem.subjectId,
      subjectName: sName,
      text: `Complete high-priority deliverable: ${item.sem.title} (due in ${item.daysLeft} days)`,
      completed: false,
      type: `${item.sem.type} Lab Prep`,
      badge: "Urgent"
    });
  });

  // Calculate dynamic hour allocation across high-priority subjects
  // Distribute available hours. Each task target is roughly 45 mins - 1 hour
  const totalTasksTarget = Math.max(2, Math.min(6, Math.round(availableHours * 1.2)));
  
  let subjectIdx = 0;
  while (tasks.length < totalTasksTarget && activeSubjects.length > 0) {
    const item = activeSubjects[subjectIdx % activeSubjects.length];
    const s = item.subj;
    const remainingUnits = s.totalUnits - s.completedUnits;
    const isSubjWeak = s.weak;

    // Cycle through types based on focus preference and completed ratio
    const compRatio = s.completedUnits / s.totalUnits;
    let type = "Active Recall Practice";
    let text = "";
    let badge: Task['badge'] = "Core";

    const taskCountForSubj = tasks.filter(t => t.subjectId === s.id).length;

    if (taskCountForSubj === 0) {
      if (item.daysRemaining !== null && item.daysRemaining <= 5) {
        type = "Mock Practice";
        text = `Solve standard practice question papers for ${s.name} (Timed)`;
        badge = "Exam";
      } else if (isSubjWeak) {
        type = "Active Recall";
        text = `Draft a review card answering core concepts on ${s.name} from memory`;
        badge = "Weak";
      } else if (compRatio < 0.4) {
        type = "Learn new concept";
        text = `Engage core textbook Chapter ${s.completedUnits + 1} definition reading for ${s.name}`;
        badge = "Core";
      } else {
        type = "Active Study";
        text = `Synthesize summaries and solve 5 problem sets for ${s.name}`;
        badge = "Build";
      }
    } else if (taskCountForSubj === 1) {
      type = "Spaced Revision";
      text = `Revise flashcard deck or review yesterday's checklist modules for ${s.name}`;
      badge = s.nextRevisionDate ? "Due" : "Small win";
    } else {
      type = "Mixed Drill";
      text = `Complete custom quiz sets covering old units of ${s.name}`;
      badge = "Build";
    }

    if (text) {
      tasks.push({
        id: `l-task-auto-${s.id}-${tasks.length}`,
        subjectId: s.id,
        subjectName: s.name,
        text,
        completed: false,
        type,
        badge
      });
    }

    subjectIdx++;
    // break infinite loops
    if (subjectIdx > 50) break;
  }

  // Ensure small buffer task if total tasks are few
  if (tasks.length < totalTasksTarget) {
    tasks.push({
      id: "l-task-buffer",
      subjectName: "General",
      text: "Perform a quick 10-minute active review of your study logs from this week",
      completed: false,
      type: "Reflection",
      badge: "Small win"
    });
  }

  return tasks.slice(0, totalTasksTarget);
}

/**
 * Calculates forgetting curve retrievability.
 * Stability (S) increases on each successive spaced repetition session.
 */
export function getForgettingCurveStats(lastStudied: string | null, stage: number) {
  if (!lastStudied) return { retrievability: 100, status: 'Fresh' };
  
  const daysSince = getDaysRemaining(lastStudied);
  if (daysSince === null) return { retrievability: 100, status: 'Fresh' };
  const dCount = Math.abs(daysSince); // absolute days since studied

  // Define stability half-lives (in days) depending on spaced repetition stage
  let stability = 1.0; // Stage 0
  if (stage === 1) stability = 3.0; // Stage 1 (after 1 day due)
  if (stage === 2) stability = 7.0; // Stage 2 (after 3 days due)
  if (stage >= 3) stability = 14.0; // Stage 3 (after 7 days due)

  // R = e^(-t/S)
  const retrievability = Math.exp(-dCount / stability);
  const percentIdx = Math.round(retrievability * 100);

  let status = 'Solid';
  if (percentIdx < 50) status = 'Nearly Forgotten';
  else if (percentIdx < 75) status = 'Weakening';
  else if (percentIdx < 90) status = 'Moderate';

  return {
    retrievability: percentIdx,
    status
  };
}

