import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Subject } from "../types";

interface ManageSubjectModalProps {
  subject: Subject | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: Subject) => void;
  onDelete: (id: string) => void;
}

export const ManageSubjectModal: React.FC<ManageSubjectModalProps> = ({
  subject,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [name, setName] = useState("");
  const [totalUnits, setTotalUnits] = useState(0);
  const [completedUnits, setCompletedUnits] = useState(0);
  const [examDate, setExamDate] = useState("");

const [difficultyBias, setDifficultyBias] = useState(0);
const [weak, setWeak] = useState(false);

const [revisionStage, setRevisionStage] = useState(0);
const [lastStudiedDate, setLastStudiedDate] = useState("");
const [nextRevisionDate, setNextRevisionDate] = useState("");

useEffect(() => {
    if (!subject) return;

    setName(subject.name);
    setTotalUnits(subject.totalUnits);
    setCompletedUnits(subject.completedUnits);
    setExamDate(subject.examDate ?? "");

    setDifficultyBias(subject.difficultyBias);
    setWeak(subject.weak);

    setRevisionStage(subject.revisionStage);
    setLastStudiedDate(subject.lastStudiedDate ?? "");
    setNextRevisionDate(subject.nextRevisionDate ?? "");
}, [subject]);

const handleSave = () => {
    if (!subject) return;

    const updatedSubject: Subject = {
        ...subject,

        name,
        totalUnits,
        completedUnits,
        examDate: examDate || null,

        difficultyBias,
        weak,

        revisionStage,
        lastStudiedDate: lastStudiedDate || null,
        nextRevisionDate: nextRevisionDate || null,
    };

    onSave(updatedSubject);
    onClose();
};

const handleDelete = () => {
    if (!subject) return;

    if (confirm(`Delete "${subject.name}"?`)) {
        onDelete(subject.id);
        onClose();
    }
};

if (!isOpen || !subject) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold">
            Manage Subject
          </h2>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
       <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

    {/* Subject Information */}

    <div>
        <h3 className="font-semibold mb-3">Subject Information</h3>

        <div className="space-y-4">

            <div>
                <label className="block text-sm mb-1">
                    Subject Name
                </label>

                <input
                    className="w-full rounded-lg border p-3 dark:bg-slate-800"
                    value={name}
                    onChange={(e)=>setName(e.target.value)}
                />
            </div>

            <div>
                <label className="block text-sm mb-1">
                    Exam Date
                </label>

                <input
                    type="date"
                    className="w-full rounded-lg border p-3 dark:bg-slate-800"
                    value={examDate}
                    onChange={(e)=>setExamDate(e.target.value)}
                />
            </div>

        </div>
    </div>

    {/* Progress */}

    <div>

        <h3 className="font-semibold mb-3">
            Progress
        </h3>

        <div className="grid grid-cols-2 gap-4">

            <div>
                <label className="block text-sm mb-1">
                    Completed Units
                </label>

                <input
                    type="number"
                    value={completedUnits}
                    onChange={(e)=>setCompletedUnits(Number(e.target.value))}
                    className="w-full rounded-lg border p-3 dark:bg-slate-800"
                />
            </div>

            <div>
                <label className="block text-sm mb-1">
                    Total Units
                </label>

                <input
                    type="number"
                    value={totalUnits}
                    onChange={(e)=>setTotalUnits(Number(e.target.value))}
                    className="w-full rounded-lg border p-3 dark:bg-slate-800"
                />
            </div>

        </div>
    </div>

    {/* AI Planning */}

    <div>

        <h3 className="font-semibold mb-3">
            AI Planning
        </h3>

        <div className="space-y-4">

            <div>

                <label className="block text-sm mb-1">
                    Difficulty Bias
                </label>

                <input
                    type="range"
                    min={-3}
                    max={3}
                    value={difficultyBias}
                    onChange={(e)=>setDifficultyBias(Number(e.target.value))}
                    className="w-full"
                />

                <p className="text-sm text-slate-500 mt-1">
                    {difficultyBias}
                </p>

            </div>

            <label className="flex items-center gap-3">

                <input
                    type="checkbox"
                    checked={weak}
                    onChange={(e)=>setWeak(e.target.checked)}
                />

                Weak Subject

            </label>

        </div>

    </div>

    {/* Revision */}

    <div>

        <h3 className="font-semibold mb-3">
            Revision
        </h3>

        <div className="space-y-4">

            <select
                value={revisionStage}
                onChange={(e)=>setRevisionStage(Number(e.target.value))}
                className="w-full rounded-lg border p-3 dark:bg-slate-800"
            >
                <option value={0}>Stage 0</option>
                <option value={1}>Stage 1</option>
                <option value={2}>Stage 2</option>
                <option value={3}>Stage 3</option>
            </select>

            <input
                type="date"
                value={lastStudiedDate}
                onChange={(e)=>setLastStudiedDate(e.target.value)}
                className="w-full rounded-lg border p-3 dark:bg-slate-800"
            />

            <input
                type="date"
                value={nextRevisionDate}
                onChange={(e)=>setNextRevisionDate(e.target.value)}
                className="w-full rounded-lg border p-3 dark:bg-slate-800"
            />

        </div>

    </div>

    {/* Footer */}

    <div className="flex justify-between pt-4 border-t">

        <button
            onClick={handleDelete}
            className="text-red-600"
        >
            Delete Subject
        </button>

        <div className="space-x-2">

            <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border"
            >
                Cancel
            </button>

            <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white"
            >
                Save Changes
            </button>

        </div>

    </div>

</div>

      </div>
    </div>
  );
};