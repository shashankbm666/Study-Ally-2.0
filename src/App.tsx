/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Sparkles, LayoutDashboard, BrainCircuit, FileText,
  Clock, Trophy, Settings, Flame, GraduationCap, LogOut, Loader2
} from "lucide-react";

// Components imports
import { DashboardTab } from "./components/DashboardTab";
import { PlannerTab } from "./components/PlannerTab";
import { RevisionTab } from "./components/RevisionTab";
import { AnalyticsTab } from "./components/AnalyticsTab";
import { CoachTab } from "./components/CoachTab";
import { MaterialsTab } from "./components/MaterialsTab";
import { SemesterTab } from "./components/SemesterTab";
import { FocusTab } from "./components/FocusTab";
import { SettingsTab } from "./components/SettingsTab";

// Models & utility imports
import { Subject, Task, SemesterItem, StudyNote, Flashcard, JournalEntry, StudySessionLog } from "./types";

// --- Generic helpers (ponytail: shrink save/hydrate boilerplate) ---
function persist<T>(key: string, setter: React.Dispatch<React.SetStateAction<T>>) {
  return (value: T) => {
    setter(value);
    localStorage.setItem(key, JSON.stringify(value));
  };
}

function hydrate<T>(key: string, setter: React.Dispatch<React.SetStateAction<T>>, fallback: T) {
  const raw = localStorage.getItem(key);
  if (raw) {
    setter(JSON.parse(raw));
  } else {
    setter(fallback);
    localStorage.setItem(key, JSON.stringify(fallback));
  }
}

// --- Nav items config (ponytail: shrink 9 identical buttons) ---
const navItems = [
  { key: "dashboard", icon: LayoutDashboard, label: "Overview Panel" },
  { key: "planner", icon: Clock, label: "Smart Study Planner" },
  { key: "revisions", icon: BrainCircuit, label: "Spaced Revision Stages" },
  { key: "semesters", icon: GraduationCap, label: "Semester Calendar" },
  { key: "materials", icon: FileText, label: "Study Aids & Quizzes" },
  { key: "coach", icon: Sparkles, label: "AI Coach Office", pulse: true },
  { key: "focus", icon: Flame, label: "Pomodoro Focus Timer", iconClass: "text-rose-500" },
  { key: "analytics", icon: Trophy, label: "Heatmap Logs" },
  { key: "settings", icon: Settings, label: "Backups & Milestones" },
] as const;

export default function App() {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();

  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // --- Core State Entities ---
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [semesters, setSemesters] = useState<SemesterItem[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [logs, setLogs] = useState<StudySessionLog[]>([]);
  const [streak, setStreak] = useState<number>(0);

  // Custom Planner preference indicators
  const [availableHours, setAvailableHours] = useState<number>(3);
  const [focusPreference, setFocusPreference] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // --- Persistent save wrappers (ponytail: one-liner each) ---
  const saveSubjects = persist("sa_subjects_c", setSubjects);
  const saveTasks = persist("sa_tasks_c", setTasks);
  const saveSemesters = persist("sa_semesters_c", setSemesters);
  const saveNotes = persist("sa_notes_c", setNotes);
  const saveFlashcards = persist("sa_flashcards_c", setFlashcards);
  const saveJournals = persist("sa_journals_c", setJournals);
  const saveLogs = persist("sa_logs_c", setLogs);
  const saveStreak = persist("sa_streak_c", setStreak);

  // --- Initial Mount State Hydration ---
  useEffect(() => {
    const offsetDate = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    hydrate<Subject[]>("sa_subjects_c", setSubjects, [
      { id: "s-1", name: "Discrete Mathematics", totalUnits: 12, completedUnits: 5, examDate: offsetDate(14), revisionStage: 1, lastStudiedDate: offsetDate(-1), nextRevisionDate: offsetDate(0), difficultyBias: 0, weak: false },
      { id: "s-2", name: "Design of Algorithms", totalUnits: 16, completedUnits: 8, examDate: offsetDate(10), revisionStage: 2, lastStudiedDate: offsetDate(-2), nextRevisionDate: offsetDate(1), difficultyBias: 1, weak: true },
      { id: "s-3", name: "Operating Systems", totalUnits: 14, completedUnits: 4, examDate: offsetDate(6), revisionStage: 0, lastStudiedDate: null, nextRevisionDate: null, difficultyBias: -1, weak: false }
    ]);

    hydrate<Task[]>("sa_tasks_c", setTasks, [
      { id: "t-1", subjectId: "s-1", subjectName: "Discrete Mathematics", text: "Revise Graph proofs using active recall summary", completed: false, type: "Spaced Revision", badge: "Due" },
      { id: "t-2", subjectId: "s-2", subjectName: "Design of Algorithms", text: "Practice 10 binary search recursively coded complexity traces", completed: false, type: "Mock Practice", badge: "Urgent" },
      { id: "t-3", subjectId: "s-3", subjectName: "Operating Systems", text: "Learn critical section mutual exclusion concepts", completed: false, type: "Learn new concept", badge: "Core" }
    ]);

    hydrate<SemesterItem[]>("sa_semesters_c", setSemesters, [
      { id: "sem-1", title: "Probability Assignment Draft", subjectId: "s-1", subjectName: "Discrete Mathematics", type: "Assignment", deadline: offsetDate(4), completed: false, priority: "High" },
      { id: "sem-2", title: "CPU scheduling simulation log", subjectId: "s-3", subjectName: "Operating Systems", type: "Lab Record", deadline: offsetDate(3), completed: false, priority: "Medium" }
    ]);

    hydrate<StudyNote[]>("sa_notes_c", setNotes, [
      { id: "n-1", subjectId: "s-2", title: "Greedy Greedy vs DP Approach", content: "Greedy chooses local optimal increments. DP solves sub-overlapping subproblems and memoizes solutions for optimal sub-structure validations.", updatedAt: offsetDate(-1) }
    ]);

    hydrate<Flashcard[]>("sa_flashcards_c", setFlashcards, [
      { id: "fc-1", subjectId: "s-1", question: "What is Bayes' theorem?", answer: "P(A|B) = [P(B|A) * P(A)] / P(B). Dictates probability calculation with prior condition updates." }
    ]);

    hydrate<JournalEntry[]>("sa_journals_c", setJournals, [
      { id: "j-1", date: offsetDate(-1), notes: "Solved Operating system mutual exclusion semaphores correctly today. Verified Discrete Probability proofs easily and logged 25 min Pomodoro block.", understandingRating: 4 }
    ]);

    hydrate<StudySessionLog[]>("sa_logs_c", setLogs, [
      { date: offsetDate(-2), minutes: 25, subjectId: "s-1", difficultyRating: "M" },
      { date: offsetDate(-1), minutes: 50, subjectId: "s-2", difficultyRating: "M" },
      { date: offsetDate(0), minutes: 25, subjectId: "s-3", difficultyRating: "E" }
    ]);

    const streakVal = localStorage.getItem("sa_streak_c") || "4";
    setStreak(parseInt(streakVal) || 4);

    const hoursVal = localStorage.getItem("sa_hours_c") || "3";
    setAvailableHours(parseInt(hoursVal) || 3);

    const fpVal = localStorage.getItem("sa_fpref_c") || "morning";
    setFocusPreference(fpVal as any);

    const thVal = localStorage.getItem("sa_theme_c") || "light";
    setTheme(thVal as any);
    if (thVal === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // --- UI Action Handlers ---
  const handleToggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("sa_theme_c", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleAddSubject = (name: string, total: number, done: number, date: string) => {
    const fresh: Subject = {
      id: `s-${Date.now()}`,
      name,
      totalUnits: total,
      completedUnits: done,
      examDate: date || null,
      revisionStage: 0,
      lastStudiedDate: null,
      nextRevisionDate: null,
      difficultyBias: 0,
      weak: false
    };
    saveSubjects([...subjects, fresh]);
  };

  const handleDeleteSubject = (id: string) => {
    saveSubjects(subjects.filter(s => s.id !== id));
    saveSemesters(semesters.filter(sem => sem.subjectId !== id));
    saveFlashcards(flashcards.filter(fc => fc.subjectId !== id));
    saveNotes(notes.filter(n => n.subjectId !== id));
  };

  const handleUpdateSubjectProgress = (id: string, completedUnits: number) => {
    const next = subjects.map(s => {
      if (s.id === id) {
        return { ...s, completedUnits, lastStudiedDate: new Date().toISOString().split('T')[0] };
      }
      return s;
    });
    saveSubjects(next);
  };

  const handleToggleTask = (taskId: string) => {
    const next = tasks.map(t => {
      if (t.id === taskId) {
        const isNowDone = !t.completed;
        if (t.subjectId) {
          const correspondingSub = subjects.find(s => s.id === t.subjectId);
          if (correspondingSub) {
            let nextCompletedCount = correspondingSub.completedUnits;
            if (isNowDone) {
              nextCompletedCount = Math.min(correspondingSub.totalUnits, nextCompletedCount + 1);
              try {
                const diff = prompt(`Check completed! How did you find "${t.text}"?\nEnter E for Easy, M for Medium, or H for Hard:`, "M");
                if (diff) {
                  const parsedDiff = diff.trim().toUpperCase().charAt(0) as 'E' | 'M' | 'H';
                  if (['E', 'M', 'H'].includes(parsedDiff)) {
                    handleLogRevisionFeedback(t.subjectId, parsedDiff);
                  }
                }
              } catch (e) {}
            } else {
              nextCompletedCount = Math.max(0, nextCompletedCount - 1);
            }
            handleUpdateSubjectProgress(t.subjectId, nextCompletedCount);
          }
        }
        return { ...t, completed: isNowDone };
      }
      return t;
    });
    saveTasks(next);
  };

  const handleAddCustomTask = (text: string, subjectId?: string, type?: string) => {
    const matchesName = subjectId ? subjects.find(s => s.id === subjectId)?.name : null;
    const fresh: Task = {
      id: `t-manual-${Date.now()}`,
      subjectId,
      subjectName: matchesName || "General",
      text,
      completed: false,
      type: type || "Manual Check",
      badge: "Small win"
    };
    saveTasks([...tasks, fresh]);
  };

  const handleLogRevisionFeedback = (subjectId: string, difficulty: 'E' | 'M' | 'H') => {
    const todayStr = new Date().toISOString().split('T')[0];

    const isAlreadyStudiedDate = logs.some(l => l.date === todayStr && l.subjectId === subjectId);
    if (!isAlreadyStudiedDate) {
      saveLogs([...logs, { date: todayStr, minutes: 25, subjectId, difficultyRating: difficulty }]);
    }

    const isStudiedEarlierToday = logs.some(l => l.date === todayStr);
    if (!isStudiedEarlierToday) {
      saveStreak(streak + 1);
    }

    const nextSubs = subjects.map(s => {
      if (s.id === subjectId) {
        let stage = s.revisionStage;
        let daysOffset = 1;

        if (difficulty === 'E') {
          stage = Math.min(3, stage + 1);
          s.weak = false;
        } else if (difficulty === 'H') {
          stage = 0;
          s.weak = true;
        }

        if (stage === 1) daysOffset = 1;
        else if (stage === 2) daysOffset = 3;
        else if (stage === 3) daysOffset = 7;

        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + daysOffset);

        return {
          ...s,
          revisionStage: stage,
          lastStudiedDate: todayStr,
          nextRevisionDate: nextDate.toISOString().split('T')[0]
        };
      }
      return s;
    });
    saveSubjects(nextSubs);
  };

  const handleAddSemesterItem = (
    title: string, subjectId: string, type: SemesterItem['type'],
    deadline: string, priority: SemesterItem['priority']
  ) => {
    const sName = subjects.find(s => s.id === subjectId)?.name || "General";
    saveSemesters([...semesters, {
      id: `sem-${Date.now()}`, title, subjectId, subjectName: sName,
      type, deadline, completed: false, priority
    }]);
  };

  const handleToggleSemesterCompleted = (id: string) => {
    saveSemesters(semesters.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const handleDeleteSemesterItem = (id: string) => {
    saveSemesters(semesters.filter(s => s.id !== id));
  };

  const handleAddNote = (subjectId: string, title: string, content: string) => {
    saveNotes([...notes, {
      id: `note-${Date.now()}`, subjectId, title, content,
      updatedAt: new Date().toISOString().split('T')[0]
    }]);
  };

  const handleDeleteNote = (id: string) => saveNotes(notes.filter(n => n.id !== id));

  const handleAddFlashcard = (subjectId: string, question: string, answer: string) => {
    saveFlashcards([...flashcards, { id: `fc-${Date.now()}`, subjectId, question, answer }]);
  };

  const handleDeleteFlashcard = (id: string) => saveFlashcards(flashcards.filter(fc => fc.id !== id));

  const handleAddJournalEntry = (notesContent: string, ratingValue: number) => {
    saveJournals([...journals, {
      id: `j-${Date.now()}`, date: new Date().toISOString().split('T')[0],
      notes: notesContent, understandingRating: ratingValue
    }]);
  };

  const handleLogStudyMinutes = (minutesClocked: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    saveLogs([...logs, {
      date: todayStr, minutes: minutesClocked,
      subjectId: subjects[0]?.id || "s-1", difficultyRating: "M"
    }]);
  };

  const handleImportData = (payload: string) => {
    try {
      const parsed = JSON.parse(payload);
      if (parsed.subjects) saveSubjects(parsed.subjects);
      if (parsed.semesters) saveSemesters(parsed.semesters);
      if (parsed.notes) saveNotes(parsed.notes);
      if (parsed.flashcards) saveFlashcards(parsed.flashcards);
      if (parsed.journals) saveJournals(parsed.journals);
      if (parsed.logs) saveLogs(parsed.logs);
      if (parsed.streak) saveStreak(parsed.streak);
      alert("Data rehydrated and synchronized correctly!");
    } catch (e) {
      alert("Incorrect JSON payload structure.");
    }
  };

  const handleClearAllData = () => {
    localStorage.clear();
    setSubjects([]); setTasks([]); setSemesters([]); setNotes([]);
    setFlashcards([]); setJournals([]); setLogs([]);
    setStreak(0); setAvailableHours(3); setFocusPreference("morning");
  };

  // --- Auth0 Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-violet-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Loading Study Ally...</p>
        </div>
      </div>
    );
  }

  // --- Auth0 Login Screen ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md p-8 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/96 to-slate-950/96 shadow-2xl text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <span className="p-2.5 rounded-xl bg-violet-950/40 text-violet-400">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Study Ally</h1>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-violet-950/50 text-violet-300">PRO v2.5</span>
          </div>
          <p className="text-sm text-slate-400 font-medium">
            Your AI-powered study command center. Sign in to access your dashboard.
          </p>
          <button
            onClick={() => loginWithRedirect()}
            className="w-full py-3 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition shadow-lg shadow-violet-600/20"
          >
            Sign in with Auth0
          </button>
          <p className="text-xs text-slate-500">Secure authentication powered by Auth0</p>
        </div>
      </div>
    );
  }

  // --- Main Authenticated Dashboard ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Banner */}
        <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Study Ally
                </h1>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300">
                  PRO v2.5
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic font-medium">
                Welcome back, {user?.name || user?.email || "student"}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:self-center">

              {/* Active streak */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-amber-500 text-white shadow-md shadow-amber-500/10 hover:scale-105 transition-transform duration-200">
                <Flame className="w-4 h-4 fill-current animate-bounce" />
                <span>Streak {streak} Days</span>
              </div>

              {/* Theme switcher */}
              <button
                onClick={handleToggleTheme}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Toggle theme appearance"
              >
                {theme === "light" ? "🌙" : "☀️"}
              </button>

              {/* Logout */}
              <button
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="p-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>

            </div>

          </div>
        </div>

        {/* Master grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Sidebar nav (ponytail: shrink with map) */}
          <nav className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl space-y-2 select-none shadow-sm flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-4.5 py-3 text-xs font-extrabold rounded-xl text-left transition duration-150 flex-shrink-0 relative ${
                  activeTab === item.key
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
                }`}
              >
                <item.icon className={`w-4 h-4 ${'iconClass' in item ? item.iconClass : ''} ${item.key === 'coach' && activeTab !== 'coach' ? 'text-violet-500 fill-violet-500' : ''}`} />
                <span>{item.label}</span>
                {'pulse' in item && item.pulse && (
                  <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" />
                )}
              </button>
            ))}
          </nav>

          {/* Core Panel Content */}
          <main className="lg:col-span-9 bg-transparent">
            {activeTab === "dashboard" && (
              <DashboardTab
                subjects={subjects} semesters={semesters}
                onAddSubject={handleAddSubject} onDeleteSubject={handleDeleteSubject}
                onUpdateSubjectProgress={handleUpdateSubjectProgress}
                onNavigateToTab={(tabId) => setActiveTab(tabId)}
              />
            )}
            {activeTab === "planner" && (
              <PlannerTab
                subjects={subjects} semesters={semesters} tasks={tasks}
                availableHours={availableHours} focusPreference={focusPreference}
                onSetAvailableHours={(hours) => { setAvailableHours(hours); localStorage.setItem("sa_hours_c", String(hours)); }}
                onSetFocusPreference={(pref) => { setFocusPreference(pref); localStorage.setItem("sa_fpref_c", pref); }}
                onSetTasks={saveTasks} onToggleTask={handleToggleTask} onAddCustomTask={handleAddCustomTask}
              />
            )}
            {activeTab === "revisions" && (
              <RevisionTab
                subjects={subjects} onLogRevisionFeedback={handleLogRevisionFeedback}
                onRefreshRevisions={() => { setSubjects([...subjects]); alert("Spaced repetition decay stages updated!"); }}
              />
            )}
            {activeTab === "semesters" && (
              <SemesterTab
                subjects={subjects} semesters={semesters}
                onAddSemesterItem={handleAddSemesterItem}
                onToggleSemesterCompleted={handleToggleSemesterCompleted}
                onDeleteSemesterItem={handleDeleteSemesterItem}
              />
            )}
            {activeTab === "materials" && (
              <MaterialsTab
                subjects={subjects} flashcards={flashcards} notes={notes}
                onAddFlashcard={handleAddFlashcard} onDeleteFlashcard={handleDeleteFlashcard}
                onAddNote={handleAddNote} onDeleteNote={handleDeleteNote}
                onEvaluateFlashcard={handleLogRevisionFeedback}
              />
            )}
            {activeTab === "coach" && (
              <CoachTab subjects={subjects} semesters={semesters} streak={streak} />
            )}
            {activeTab === "focus" && (
              <FocusTab
                journals={journals} onAddJournalEntry={handleAddJournalEntry}
                onLogStudyMinutes={handleLogStudyMinutes}
              />
            )}
            {activeTab === "analytics" && (
              <AnalyticsTab subjects={subjects} logs={logs} journals={journals} streak={streak} />
            )}
            {activeTab === "settings" && (
              <SettingsTab
                subjects={subjects} semesters={semesters} notes={notes}
                flashcards={flashcards} journals={journals} logs={logs} streak={streak}
                onImportData={handleImportData} onClearAllData={handleClearAllData}
              />
            )}
          </main>

        </div>
      </div>
    </div>
  );
}
