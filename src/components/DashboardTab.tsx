/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {   
  Plus,Calendar,Trash2,MoreVertical,Edit3,Copy,Archive,CheckCircle2,TrendingUp,AlertCircle,
  HelpCircle,ChevronRight,Activity,BookOpen,Clock,AlertTriangle
} from "lucide-react";
import { Subject, SemesterItem } from "../types";
import { getDaysRemaining, calculateSubjectPriority } from "../utils/localPlanner";

interface DashboardTabProps {
  subjects: Subject[];
  semesters: SemesterItem[];
  onAddSubject: (name: string, total: number, done: number, date: string) => void;
  onDeleteSubject: (id: string) => void;
  onUpdateSubjectProgress: (id: string, completedUnits: number) => void;
  onNavigateToTab: (tabId: string) => void;
  onManageSubject: (subject: Subject) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  subjects,
  semesters,
  onAddSubject,
  onDeleteSubject,
  onUpdateSubjectProgress,
  onNavigateToTab,
  onManageSubject,
}) => {
  // Modal toggle state for new subject addition
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [name, setName] = React.useState("");
  const [totalUnits, setTotalUnits] = React.useState("10");
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);
  const [completedUnits, setCompletedUnits] = React.useState("0");
  const [examDate, setExamDate] = React.useState("");

  // Quick statistics
  const totalSubjects = subjects.length;
  const finishedSubjects = subjects.filter(s => s.completedUnits >= s.totalUnits && s.totalUnits > 0);
  const totalCompletedUnits = subjects.reduce((sum, s) => sum + s.completedUnits, 0);
  const totalAllUnits = subjects.reduce((sum, s) => sum + s.totalUnits, 0);
  
  const overallPercentage = totalAllUnits > 0 
    ? Math.round((totalCompletedUnits / totalAllUnits) * 100) 
    : 0;

  // Reality check metrics (Remaining pace estimation)
  const remainingChapters = Math.max(0, totalAllUnits - totalCompletedUnits);
  
  // Find closest upcoming exam
  const examDates = subjects
    .filter(s => s.examDate && s.completedUnits < s.totalUnits)
    .map(s => ({ subj: s, daysLeft: getDaysRemaining(s.examDate) }))
    .filter(item => item.daysLeft !== null);
  
  const nearestExam = examDates.sort((a, b) => (a.daysLeft || 0) - (b.daysLeft || 0))[0] || null;

  // Dynamic daily targets calculation based on nearest deadline
  let dailyTargetString = "—";
  let paceSlogan = "Add exam dates to compute study pace recommendations.";
  let pacingStatus: "on-track" | "warning" | "behind" | "empty" = "empty";

  if (nearestExam && nearestExam.daysLeft !== null && nearestExam.daysLeft > 0) {
    const dailyNeeded = remainingChapters / nearestExam.daysLeft;
    dailyTargetString = `${dailyNeeded.toFixed(1)} units / day`;
    
    if (dailyNeeded > 3) {
      paceSlogan = `Behind schedule! You must finish ${dailyNeeded.toFixed(1)} units daily before ${nearestExam.subj.name}.`;
      pacingStatus = "behind";
    } else if (dailyNeeded <= 1) {
      paceSlogan = "Excellent pacing! You are comfortably on track to complete everything on time.";
      pacingStatus = "on-track";
    } else {
      paceSlogan = "Healthy pace. Maintain study continuity to avoid last-minute rushing.";
      pacingStatus = "warning";
    }
  } else if (remainingChapters > 0 && subjects.some(s => s.examDate)) {
    dailyTargetString = "Immediate Attention";
    paceSlogan = "Exam is extremely close! Transition your planning into mock exam sprints.";
    pacingStatus = "behind";
  } else if (remainingChapters === 0 && totalAllUnits > 0) {
    dailyTargetString = "0 units / day";
    paceSlogan = "Congratulations! All curriculum checkpoints cleared. Enjoy light revisions.";
    pacingStatus = "on-track";
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const total = parseInt(totalUnits) || 10;
    const completed = parseInt(completedUnits) || 0;
    onAddSubject(name, total, completed, examDate);
    setName("");
    setTotalUnits("10");
    setCompletedUnits("0");
    setExamDate("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Executive Performance Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Progress Card Gauges */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md shadow-violet-600/15">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-violet-100 uppercase tracking-wider">Overall Progress</p>
              <h3 className="text-2xl font-black mt-2">{overallPercentage}% Done</h3>
            </div>
            <Activity className="w-5 h-5 text-violet-200" />
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white transition-all duration-300" style={{ width: `${overallPercentage}%` }} />
          </div>
          <p className="mt-2.5 text-xs text-violet-100 font-medium">
            Accumulated {totalCompletedUnits} of {totalAllUnits} total units
          </p>
        </div>

        {/* Reality Check Pacing */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Target Pace</p>
              <h3 className="text-xl font-extrabold mt-2 text-slate-800 dark:text-white truncate">
                {dailyTargetString}
              </h3>
            </div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-2">
            {paceSlogan}
          </p>
        </div>

        {/* Exam Countdown Widget */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Exam Countdown</p>
              <h3 className="text-xl font-extrabold mt-2 text-slate-800 dark:text-white">
                {nearestExam 
                  ? `${Math.max(0, nearestExam.daysLeft || 0)} Days` 
                  : "No exams yet"}
              </h3>
            </div>
            <Calendar className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            {nearestExam ? (
              <>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {nearestExam.subj.name}
                </span>
                <span>on {nearestExam.subj.examDate}</span>
              </>
            ) : (
              <span>Double-click subject to add deadline.</span>
            )}
          </div>
        </div>

        {/* Curriculum Status Checkpoint */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Finished Subjects</p>
              <h3 className="text-xl font-extrabold mt-2 text-slate-800 dark:text-white">
                {finishedSubjects.length} / {totalSubjects}
              </h3>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-4 flex items-center gap-1">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">
              {totalSubjects - finishedSubjects.length} active
            </span>
            <span className="text-xs text-slate-400">to study</span>
          </div>
        </div>

      </section>

      {/* 2. Subjects Catalog Title & Add Trigger */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Subject Overview</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Double-click any card to delete the subject from your planner.</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition shadow-md shadow-violet-600/10"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>

        {/* Interactive Add Subject overlay container */}
        {showAddForm && (
          <form 
            onSubmit={handleSubmit}
            className="mb-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-4 transition"
          >
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Create New Course Checkpoint</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">SUBJECT NAME</label>
                <input
                  type="text"
                  placeholder="e.g., Computer Organization"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:border-violet-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">TOTAL CHAPTERS/UNITS</label>
                <input
                  type="number"
                  placeholder="10"
                  value={totalUnits}
                  min="1"
                  onChange={(e) => setTotalUnits(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:border-violet-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">COMPLETED WORK (UNITS)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={completedUnits}
                  min="0"
                  onChange={(e) => setCompletedUnits(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">EXAM DATE</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-violet-600 hover:bg-violet-700 transition"
              >
                Create Checkpoint
              </button>
            </div>
          </form>
        )}

        {/* Subjects Grid Layout */}
        {subjects.length === 0 ? (
          <div
            onClick={() => setShowAddForm(true)}
            className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-violet-400 transition-colors duration-200 cursor-pointer"
          >
            <Plus className="w-8 h-8 text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No subjects currently active</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
              Study Ally helps schedule everything by balancing your relative workload. Click here to add your first course.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map(s => {
              const rectCompleted = s.completedUnits;
              const rectTotal = s.totalUnits;
              const percentage = Math.round((rectCompleted / rectTotal) * 100);
              const daysLeft = getDaysRemaining(s.examDate);
              const priority = calculateSubjectPriority(s);

              // Determine urgency dot colors and statuses
              let urgencyColor = "bg-green-500";
              let urgencyLabel = "Low pressure";
              if (s.weak) {
                urgencyColor = "bg-red-500";
                urgencyLabel = "Weak area";
              } else if (daysLeft !== null) {
                if (daysLeft <= 4) {
                  urgencyColor = "bg-red-500 animate-ping";
                  urgencyLabel = "Highly Urgent";
                } else if (daysLeft <= 8) {
                  urgencyColor = "bg-amber-500";
                  urgencyLabel = "Moderate Pressure";
                }
              }

              // Incremental changes helper
              const handleIncrement = (val: number) => {
                const nextVal = Math.min(rectTotal, Math.max(0, rectCompleted + val));
                onUpdateSubjectProgress(s.id, nextVal);
              };

              return (
                <div
                  key={s.id}
                  onDoubleClick={() => {
                    if (confirm(`Remove "${s.name}"? This deletes its tracking logs.`)) {
                      onDeleteSubject(s.id);
                    }
                  }}
                  className="relative group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 select-none overflow-visible "
                >
                  {/* Top Subject card descriptor line */}
                  <div className="flex justify-between items-start gap-6 pr-10 mb-2">
                    <h3 className="font-extrabold text-slate-800 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition truncate" title="Double click to remove">
                      {s.name}
                    </h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full ${urgencyColor}`} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {daysLeft !== null ? `${daysLeft}d left` : "No date"}
                      </span>
                    </div>
                  </div>

                  {/* Log counters */}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-semibold">
                    Progress: {rectCompleted} / {rectTotal} modules完成
                  </p>

                  {/* Progress filler line */}
                  <div className="relative h-2 w-full rounded-full bg-slate-50 dark:bg-slate-800 overflow-hidden mb-5">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        percentage >= 75 ? "bg-emerald-500" : percentage >= 40 ? "bg-amber-500" : "bg-indigo-500"
                      }`}
                      style={{ width: 0% `${percentage}%` }}
                    />
                  </div>

                  {/* Interactive unit bumpers & urgency metrics overlay */}
                  <div className="flex justify-between items-center gap-2">
                    {/* Unit Incrementors */}
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                      <button
                        onClick={() => handleIncrement(-1)}
                        className="px-2.5 py-1 rounded text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition"
                        title="Decrement completed units"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleIncrement(1)}
                        className="px-2.5 py-1 rounded text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition"
                        title="Increment completed units"
                      >
                        +1
                      </button>
                    </div>

                    {/* Percentage Pill */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{urgencyLabel}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-black text-white ${
                        percentage >= 75 ? "bg-emerald-500/90" : percentage >= 40 ? "bg-amber-500/95" : "bg-violet-600/90"
                      }`}>
                        {percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Hover trash icons so mobile / single clickers can perform deletion visually */}
                  <div className="absolute top-3 right-2 z-50">
  <button
    onClick={() =>
      setActiveMenu(activeMenu === s.id ? null : s.id)
    }
    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
  >
    <MoreVertical className="w-4 h-4 text-slate-500" />
  </button>

  {activeMenu === s.id && (
    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-50">

      <button
  onClick={() => {
    onManageSubject(s);
    setActiveMenu(null);
  }}
  className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition"
>
  <Edit3 className="w-4 h-4" />
  Manage Subject
      </button>

      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      >
        <Copy className="w-4 h-4" />
        Duplicate Subject
      </button>

      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      >
        <Archive className="w-4 h-4" />
        Archive Subject
      </button>

      <button
        onClick={() => {
          if (confirm(`Remove "${s.name}"?`)) {
            onDeleteSubject(s.id);
          }
          setActiveMenu(null);
        }}
        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
      >
        <Trash2 className="w-4 h-4" />
        Delete Subject
      </button>

    </div>
  )}
</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Quick Actions Panel Panel */}
      <section className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-1.5">Quick Actions Panel</h3>
        <p className="text-xs text-slate-400 mb-4 font-medium">Instantly access specific workspaces or trigger active recovery planners.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <button 
            onClick={() => onNavigateToTab("planner")}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-violet-500 transition text-left group"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-violet-600 dark:group-hover:text-violet-400">Daily Study Plans</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          
          <button 
            onClick={() => onNavigateToTab("focus")}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-violet-500 transition text-left group"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-rose-600 dark:group-hover:text-rose-400">Pomodoro Timer</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button 
            onClick={() => onNavigateToTab("semesters")}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-violet-500 transition text-left group"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Assignments Hub</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button 
            onClick={() => onNavigateToTab("coach")}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-violet-500 transition text-left group animate-pulse"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-violet-500 fill-violet-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-violet-600 dark:group-hover:text-violet-400">AI Coach Assistant</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

        </div>
      </section>

    </div>
  );
};
