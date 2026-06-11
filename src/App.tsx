/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Sparkles, LayoutDashboard, BrainCircuit, Calendar, FileText,
  Clock, ShieldAlert, Trophy, Settings, Flame, Star, GraduationCap
} from "lucide-react";

// Components imports
import { Header } from "./components/Header";
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
import { calculateSubjectPriority, generateSmartLocalSchedule } from "./utils/localPlanner";

export default function App() {
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

  // --- Initial Mount State Hydration ---
  useEffect(() => {
    // Determine system date offsets
    const offsetDate = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    // Hydrate Subjects Courses
    const rawSubjects = localStorage.getItem("sa_subjects_c");
    if (rawSubjects) {
      setSubjects(JSON.parse(rawSubjects));
    } else {
      const defaultSubjects: Subject[] = [
        { id: "s-1", name: "Discrete Mathematics", totalUnits: 12, completedUnits: 5, examDate: offsetDate(14), revisionStage: 1, lastStudiedDate: offsetDate(-1), nextRevisionDate: offsetDate(0), difficultyBias: 0, weak: false },
        { id: "s-2", name: "Design of Algorithms", totalUnits: 16, completedUnits: 8, examDate: offsetDate(10), revisionStage: 2, lastStudiedDate: offsetDate(-2), nextRevisionDate: offsetDate(1), difficultyBias: 1, weak: true },
        { id: "s-3", name: "Operating Systems", totalUnits: 14, completedUnits: 4, examDate: offsetDate(6), revisionStage: 0, lastStudiedDate: null, nextRevisionDate: null, difficultyBias: -1, weak: false }
      ];
      setSubjects(defaultSubjects);
      localStorage.setItem("sa_subjects_c", JSON.stringify(defaultSubjects));
    }

    // Hydrate Tasks Agenda
    const rawTasks = localStorage.getItem("sa_tasks_c");
    if (rawTasks) {
      setTasks(JSON.parse(rawTasks));
    } else {
      const defaultTasks: Task[] = [
        { id: "t-1", subjectId: "s-1", subjectName: "Discrete Mathematics", text: "Revise Graph proofs using active recall summary", completed: false, type: "Spaced Revision", badge: "Due" },
        { id: "t-2", subjectId: "s-2", subjectName: "Design of Algorithms", text: "Practice 10 binary search recursively coded complexity traces", completed: false, type: "Mock Practice", badge: "Urgent" },
        { id: "t-3", subjectId: "s-3", subjectName: "Operating Systems", text: "Learn critical section mutual exclusion concepts", completed: false, type: "Learn new concept", badge: "Core" }
      ];
      setTasks(defaultTasks);
      localStorage.setItem("sa_tasks_c", JSON.stringify(defaultTasks));
    }

    // Hydrate Semesters delivers
    const rawSemesters = localStorage.getItem("sa_semesters_c");
    if (rawSemesters) {
      setSemesters(JSON.parse(rawSemesters));
    } else {
      const defaultSemesters: SemesterItem[] = [
        { id: "sem-1", title: "Probability Assignment Draft", subjectId: "s-1", subjectName: "Discrete Mathematics", type: "Assignment", deadline: offsetDate(4), completed: false, priority: "High" },
        { id: "sem-2", title: "CPU scheduling simulation log", subjectId: "s-3", subjectName: "Operating Systems", type: "Lab Record", deadline: offsetDate(3), completed: false, priority: "Medium" }
      ];
      setSemesters(defaultSemesters);
      localStorage.setItem("sa_semesters_c", JSON.stringify(defaultSemesters));
    }

    // Hydrate notes summaries
    const rawNotes = localStorage.getItem("sa_notes_c");
    if (rawNotes) {
      setNotes(JSON.parse(rawNotes));
    } else {
      const defaultNotes: StudyNote[] = [
        { id: "n-1", subjectId: "s-2", title: "Greedy Greedy vs DP Approach", content: "Greedy chooses local optimal increments. DP solves sub-overlapping subproblems and memoizes solutions for optimal sub-structure validations.", updatedAt: offsetDate(-1) }
      ];
      setNotes(defaultNotes);
      localStorage.setItem("sa_notes_c", JSON.stringify(defaultNotes));
    }

    // Hydrate recall flashcards
    const rawFlashcards = localStorage.getItem("sa_flashcards_c");
    if (rawFlashcards) {
      setFlashcards(JSON.parse(rawFlashcards));
    } else {
      const defaultCards: Flashcard[] = [
        { id: "fc-1", subjectId: "s-1", question: "What is Bayes' theorem?", answer: "P(A|B) = [P(B|A) * P(A)] / P(B). Dictates probability calculation with prior condition updates." }
      ];
      setFlashcards(defaultCards);
      localStorage.setItem("sa_flashcards_c", JSON.stringify(defaultCards));
    }

    // Hydrate journals
    const rawJournals = localStorage.getItem("sa_journals_c");
    if (rawJournals) {
      setJournals(JSON.parse(rawJournals));
    } else {
      const defaultJournals: JournalEntry[] = [
        { id: "j-1", date: offsetDate(-1), notes: "Solved Operating system mutual exclusion semaphores correctly today. Verified Discrete Probability proofs easily and logged 25 min Pomodoro block.", understandingRating: 4 }
      ];
      setJournals(defaultJournals);
      localStorage.setItem("sa_journals_c", JSON.stringify(defaultJournals));
    }

    // Hydrate logs session
    const rawLogs = localStorage.getItem("sa_logs_c");
    if (rawLogs) {
      setLogs(JSON.parse(rawLogs));
    } else {
      const defaultLogs: StudySessionLog[] = [
        { date: offsetDate(-2), minutes: 25, subjectId: "s-1", difficultyRating: "M" },
        { date: offsetDate(-1), minutes: 50, subjectId: "s-2", difficultyRating: "M" },
        { date: offsetDate(0), minutes: 25, subjectId: "s-3", difficultyRating: "E" }
      ];
      setLogs(defaultLogs);
      localStorage.setItem("sa_logs_c", JSON.stringify(defaultLogs));
    }

    // Streak, hours, focus prefs
    const sVal = localStorage.getItem("sa_streak_c") || "4";
    setStreak(parseInt(sVal) || 4);

    const hVal = localStorage.getItem("sa_hours_c") || "3";
    setAvailableHours(parseInt(hVal) || 3);

    const fpVal = localStorage.getItem("sa_fpref_c") || "morning";
    setFocusPreference(fpVal as any);

    // Hydrate Theme preferences
    const thVal = localStorage.getItem("sa_theme_c") || "light";
    setTheme(thVal as any);
    if (thVal === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

  }, []);

  // --- Dynamic State Synchronization on state changes ---
  const saveSubjects = (newSubs: Subject[]) => {
    setSubjects(newSubs);
    localStorage.setItem("sa_subjects_c", JSON.stringify(newSubs));
  };

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem("sa_tasks_c", JSON.stringify(newTasks));
  };

  const saveSemesters = (newSems: SemesterItem[]) => {
    setSemesters(newSems);
    localStorage.setItem("sa_semesters_c", JSON.stringify(newSems));
  };

  const saveNotes = (newNotes: StudyNote[]) => {
    setNotes(newNotes);
    localStorage.setItem("sa_notes_c", JSON.stringify(newNotes));
  };

  const saveFlashcards = (newFcs: Flashcard[]) => {
    setFlashcards(newFcs);
    localStorage.setItem("sa_flashcards_c", JSON.stringify(newFcs));
  };

  const saveJournals = (newJournals: JournalEntry[]) => {
    setJournals(newJournals);
    localStorage.setItem("sa_journals_c", JSON.stringify(newJournals));
  };

  const saveLogs = (newLogs: StudySessionLog[]) => {
    setLogs(newLogs);
    localStorage.setItem("sa_logs_c", JSON.stringify(newLogs));
  };

  const saveStreak = (newStreak: number) => {
    setStreak(newStreak);
    localStorage.setItem("sa_streak_c", String(newStreak));
  };

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
    const nextSubs = subjects.filter(s => s.id !== id);
    saveSubjects(nextSubs);

    // Clear dependencies cascades
    const nextSems = semesters.filter(sem => sem.subjectId !== id);
    saveSemesters(nextSems);

    const nextFcs = flashcards.filter(fc => fc.subjectId !== id);
    saveFlashcards(nextFcs);

    const nextNotes = notes.filter(n => n.subjectId !== id);
    saveNotes(nextNotes);
  };

  const handleUpdateSubjectProgress = (id: string, completedUnits: number) => {
    const next = subjects.map(s => {
      if (s.id === id) {
        return {
          ...s,
          completedUnits,
          lastStudiedDate: new Date().toISOString().split('T')[0],
        };
      }
      return s;
    });
    saveSubjects(next);
  };

  // Checklist tasks controllers
  const handleToggleTask = (taskId: string) => {
    const next = tasks.map(t => {
      if (t.id === taskId) {
        // Toggle completed status
        const isNowDone = !t.completed;

        // If task completed has a linked subject, update completedUnits inside subjects
        if (t.subjectId) {
          const correspondingSub = subjects.find(s => s.id === t.subjectId);
          if (correspondingSub) {
            let nextCompletedCount = correspondingSub.completedUnits;
            if (isNowDone) {
              nextCompletedCount = Math.min(correspondingSub.totalUnits, nextCompletedCount + 1);
              // prompt user feedback rating (Easy/Hard dialogs) so stability stage can be calculated
              try {
                const diff = prompt(`Check completed! How did you find "${t.text}"?\nEnter E for Easy, M for Medium, or H for Hard:`, "M");
                if (diff) {
                  const parsedDiff = diff.trim().toUpperCase().toUpperCase().charAt(0) as 'E' | 'M' | 'H';
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

    // Log academic study minutes to logs database automatically
    const isAlreadyStudiedDate = logs.some(l => l.date === todayStr && l.subjectId === subjectId);
    if (!isAlreadyStudiedDate) {
      const freshLog: StudySessionLog = {
        date: todayStr,
        minutes: 25, // Record standard study block
        subjectId,
        difficultyRating: difficulty
      };
      saveLogs([...logs, freshLog]);
    }

    // Refresh cognitive streak thresholds
    const isStudiedEarlierToday = logs.some(l => l.date === todayStr);
    if (!isStudiedEarlierToday) {
      saveStreak(streak + 1);
    }

    // Refresh spaced repetition stage increments (forgetting curve stability intervals)
    const nextSubs = subjects.map(s => {
      if (s.id === subjectId) {
        let stage = s.revisionStage;
        let daysOffset = 1;

        if (difficulty === 'E') {
          stage = Math.min(3, stage + 1);
          s.weak = false;
        } else if (difficulty === 'H') {
          stage = 0; // memory reset due to difficulty decay
          s.weak = true;
        }

        // Set next study date
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

  // Semester track add item
  const handleAddSemesterItem = (
    title: string,
    subjectId: string,
    type: SemesterItem['type'],
    deadline: string,
    priority: SemesterItem['priority']
  ) => {
    const sName = subjects.find(s => s.id === subjectId)?.name || "General";
    const fresh: SemesterItem = {
      id: `sem-${Date.now()}`,
      title,
      subjectId,
      subjectName: sName,
      type,
      deadline,
      completed: false,
      priority
    };
    saveSemesters([...semesters, fresh]);
  };

  const handleToggleSemesterCompleted = (id: string) => {
    const next = semesters.map(s => {
      if (s.id === id) {
        return { ...s, completed: !s.completed };
      }
      return s;
    });
    saveSemesters(next);
  };

  const handleDeleteSemesterItem = (id: string) => {
    saveSemesters(semesters.filter(s => s.id !== id));
  };

  // Notes state changes
  const handleAddNote = (subjectId: string, title: string, content: string) => {
    const fresh: StudyNote = {
      id: `note-${Date.now()}`,
      subjectId,
      title,
      content,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    saveNotes([...notes, fresh]);
  };

  const handleDeleteNote = (id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
  };

  // Flashcard setup additions
  const handleAddFlashcard = (subjectId: string, question: string, answer: string) => {
    const fresh: Flashcard = {
      id: `fc-${Date.now()}`,
      subjectId,
      question,
      answer
    };
    saveFlashcards([...flashcards, fresh]);
  };

  const handleDeleteFlashcard = (id: string) => {
    saveFlashcards(flashcards.filter(fc => fc.id !== id));
  };

  // Journal reflections additions
  const handleAddJournalEntry = (notesContent: string, ratingValue: number) => {
    const fresh: JournalEntry = {
      id: `j-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      notes: notesContent,
      understandingRating: ratingValue
    };
    saveJournals([...journals, fresh]);
  };

  const handleLogStudyMinutes = (minutesClocked: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const freshLog: StudySessionLog = {
      date: todayStr,
      minutes: minutesClocked,
      subjectId: subjects[0]?.id || "s-1",
      difficultyRating: "M"
    };
    saveLogs([...logs, freshLog]);
  };

  // Settings sandbox controls
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
    setSubjects([]);
    setTasks([]);
    setSemesters([]);
    setNotes([]);
    setFlashcards([]);
    setJournals([]);
    setLogs([]);
    setStreak(0);
    setAvailableHours(3);
    setFocusPreference("morning");
  };

  // Show main dashboard directly
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">

      {/* Outer viewport centering container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Banner quote and dynamic values */}
        <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

            {/* Title Brand & Advice */}
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
                Welcome back to your study command center.
              </p>
            </div>

            {/* Global Stats, Theme Mode, Backup controls */}
            <div className="flex flex-wrap items-center gap-3 sm:self-center">

              {/* Active streak */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-amber-500 text-white shadow-md shadow-amber-500/10 hover:scale-105 transition-transform duration-150">
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

            </div>

          </div>
        </div>

        {/* Master Flex / grid responsive partition */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Executive sidebar rail */}
          <nav className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl space-y-2 select-none shadow-sm flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 lg:gap-0">

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4.5 py-3 text-xs font-extrabold rounded-xl text-left transition duration-150 flex-shrink-0 ${
                activeTab === "dashboard"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview Panel</span>
            </button>

            <button
              onClick={() => setActiveTab("planner")}
              className={`w-full flex items-center gap-3 px-4.5 py-3 text-xs font-extrabold rounded-xl text-left transition duration-150 flex-shrink-0 ${
                activeTab === "planner"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Smart Study Planner</span>
            </button>

            <button
              onClick={() => setActiveTab("revisions")}
              className={`w-full flex items-center gap-3 px-4.5 py-3 text-xs font-extrabold rounded-xl text-left transition duration-150 flex-shrink-0 ${
                activeTab === "revisions"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Spaced Revision Stages</span>
            </button>

            <button
              onClick={() => setActiveTab("semesters")}
              className={`w-full flex items-center gap-3 px-4.5 py-3 text-xs font-extrabold rounded-xl text-left transition duration-150 flex-shrink-0 ${
                activeTab === "semesters"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Semester Calendar</span>
            </button>

            <button
              onClick={() => setActiveTab("materials")}
              className={`w-full flex items-center gap-3 px-4.5 py-3 text-xs font-extrabold rounded-xl text-left transition duration-150 flex-shrink-0 ${
                activeTab === "materials"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Study Aids & Quizzes</span>
            </button>

            <button
              onClick={() => setActiveTab("coach")}
              className={`w-full flex items-center gap-3 px-4.5 py-3 text-xs font-extrabold rounded-xl text-left transition duration-150 flex-shrink-0 relative ${
                activeTab === "coach"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <Sparkles className="w-4 h-4 text-violet-500 fill-violet-500" />
              <span className="font-extrabold">AI Coach Office</span>
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" />
            </button>

            <button
              onClick={() => setActiveTab("focus")}
              className={`w-full flex items-center gap-3 px-4.5 py-3 text-xs font-extrabold rounded-xl text-left transition duration-150 flex-shrink-0 ${
                activeTab === "focus"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <Flame className="w-4 h-4 text-rose-500" />
              <span>Pomodoro focus Timer</span>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center gap-3 px-4.5 py-3 text-xs font-extrabold rounded-xl text-left transition duration-150 flex-shrink-0 ${
                activeTab === "analytics"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Heatmap logs</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4.5 py-3 text-xs font-extrabold rounded-xl text-left transition duration-150 flex-shrink-0 ${
                activeTab === "settings"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Backups & Milestones</span>
            </button>

          </nav>

          {/* Core Panel Content partition */}
          <main className="lg:col-span-9 bg-transparent">
            {activeTab === "dashboard" && (
              <DashboardTab
                subjects={subjects}
                semesters={semesters}
                onAddSubject={handleAddSubject}
                onDeleteSubject={handleDeleteSubject}
                onUpdateSubjectProgress={handleUpdateSubjectProgress}
                onNavigateToTab={(tabId) => setActiveTab(tabId)}
              />
            )}

            {activeTab === "planner" && (
              <PlannerTab
                subjects={subjects}
                semesters={semesters}
                tasks={tasks}
                availableHours={availableHours}
                focusPreference={focusPreference}
                onSetAvailableHours={(hours) => {
                  setAvailableHours(hours);
                  localStorage.setItem("sa_hours_c", String(hours));
                }}
                onSetFocusPreference={(pref) => {
                  setFocusPreference(pref);
                  localStorage.setItem("sa_fpref_c", pref);
                }}
                onSetTasks={saveTasks}
                onToggleTask={handleToggleTask}
                onAddCustomTask={handleAddCustomTask}
              />
            )}

            {activeTab === "revisions" && (
              <RevisionTab
                subjects={subjects}
                onLogRevisionFeedback={handleLogRevisionFeedback}
                onRefreshRevisions={() => {
                  setSubjects([...subjects]);
                  alert("Spaced repetition decay stages updated!");
                }}
              />
            )}

            {activeTab === "semesters" && (
              <SemesterTab
                subjects={subjects}
                semesters={semesters}
                onAddSemesterItem={handleAddSemesterItem}
                onToggleSemesterCompleted={handleToggleSemesterCompleted}
                onDeleteSemesterItem={handleDeleteSemesterItem}
              />
            )}

            {activeTab === "materials" && (
              <MaterialsTab
                subjects={subjects}
                flashcards={flashcards}
                notes={notes}
                onAddFlashcard={handleAddFlashcard}
                onDeleteFlashcard={handleDeleteFlashcard}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
                onEvaluateFlashcard={handleLogRevisionFeedback}
              />
            )}

            {activeTab === "coach" && (
              <CoachTab
                subjects={subjects}
                semesters={semesters}
                streak={streak}
              />
            )}

            {activeTab === "focus" && (
              <FocusTab
                journals={journals}
                onAddJournalEntry={handleAddJournalEntry}
                onLogStudyMinutes={handleLogStudyMinutes}
              />
            )}

            {activeTab === "analytics" && (
              <AnalyticsTab
                subjects={subjects}
                logs={logs}
                journals={journals}
                streak={streak}
              />
            )}

            {activeTab === "settings" && (
              <SettingsTab
                subjects={subjects}
                semesters={semesters}
                notes={notes}
                flashcards={flashcards}
                journals={journals}
                logs={logs}
                streak={streak}
                onImportData={handleImportData}
                onClearAllData={handleClearAllData}
              />
            )}
          </main>

        </div>

      </div>

    </div>
  );
}
