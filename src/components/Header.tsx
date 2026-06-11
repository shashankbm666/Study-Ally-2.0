/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Sparkles, Moon, Sun, Flame, Trophy, LogOut } from "lucide-react";

interface HeaderProps {
  streak: number;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onQuickBackup: () => void;
  totalFinishedCount: number;
  onLogout?: () => void;
  user?: { name: string; rollNo: string } | null;
}

export const Header: React.FC<HeaderProps> = ({
  streak,
  theme,
  onToggleTheme,
  onQuickBackup,
  totalFinishedCount,
  onLogout,
  user,
}) => {
  // Diverse set of academic inspiration quotes
  const quotes = [
    "Small consistent steps lead to mastery. You are fully capable.",
    "Active recall beats passive reading. Test your boundaries today!",
    "Success is the sum of small study layers repeated day in and day out.",
    "Prioritize your hardest concepts when your focus battery is full.",
    "Consistency is your greatest study ally. Keep the chain strong!",
  ];

  const [quoteIndex, setQuoteIndex] = React.useState(0);

  React.useEffect(() => {
    // Pick a steady quote based on current day
    const day = new Date().getDate();
    setQuoteIndex(day % quotes.length);
  }, []);

  return (
    <header className="mb-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-200">
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
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic font-medium selection:bg-yellow-200">
            "{quotes[quoteIndex]}"
          </p>
        </div>

        {/* Global Stats, Theme Mode, Backup controls */}
        <div className="flex flex-wrap items-center gap-3 sm:self-center">

          {/* User info */}
          {user && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span>{user.name}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 dark:text-slate-400">{user.rollNo}</span>
            </div>
          )}

          {/* Quick Stats */}
          {totalFinishedCount > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
              <Trophy className="w-3.5 h-3.5" />
              <span>{totalFinishedCount} subjects finished</span>
            </div>
          )}

          {/* Active streak */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-amber-500 text-white shadow-md shadow-amber-500/10 hover:scale-105 transition-transform duration-150">
            <Flame className="w-4 h-4 fill-current animate-bounce" />
            <span>Streak {streak} Days</span>
          </div>

          {/* Theme switcher */}
          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Toggle theme appearance"
            id="theme-setting"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Fast saving backup trigger */}
          <button
            onClick={onQuickBackup}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Saves configuration JSON instantly"
          >
            Backup
          </button>

          {/* Logout button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
              title="Logout and return to login page"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
