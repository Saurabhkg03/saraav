"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, AlertCircle, Plus, ListChecks, Settings, Download, Star, ChevronDown, ChevronUp } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Subject, SubjectMetadata, Unit, Question } from "@/lib/types";
import { QuestionItem } from "@/components/QuestionItem";
import { SyllabusView } from "@/components/SyllabusView";
import { useProgress } from "@/hooks/useProgress";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function SubjectPage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const [subject, setSubject] = useState<Subject | null>(null);
  const [metadata, setMetadata] = useState<SubjectMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'questions' | 'syllabus' | 'favourites'>('questions');
  const [isEditing, setIsEditing] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [loadedUnits, setLoadedUnits] = useState<Record<string, Unit>>({});
  const [loadingUnit, setLoadingUnit] = useState<string | null>(null);
  const [loadedSolutions, setLoadedSolutions] = useState<Record<string, string>>({});

  const fetchSolution = async (questionId: string) => {
    if (loadedSolutions[questionId]) return;

    try {
      const solutionSnap = await getDoc(doc(db, "subjects", subjectId, "solutions", questionId));
      if (solutionSnap.exists()) {
        setLoadedSolutions(prev => ({
          ...prev,
          [questionId]: solutionSnap.data().text
        }));
      }
    } catch (err) {
      console.error("Error fetching solution:", err);
    }
  };

  const toggleUnit = async (unitId: string) => {
    // If expanding and not loaded, fetch data
    if (!expandedUnits.has(unitId) && !loadedUnits[unitId]) {
      try {
        setLoadingUnit(unitId);
        const unitSnap = await getDoc(doc(db, "subjects", subjectId, "units", unitId));
        if (unitSnap.exists()) {
          setLoadedUnits(prev => ({
            ...prev,
            [unitId]: unitSnap.data() as Unit
          }));
        }
      } catch (err) {
        console.error("Error loading unit:", err);
      } finally {
        setLoadingUnit(null);
      }
    }

    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  const handleQuestionUpdate = async (unitId: string, questionId: string, updates: Partial<Question>) => {
    try {
      // 1. Get current unit data (from state or refetch if needed - simplified to use state as we are editing what we see)
      const currentUnit = loadedUnits[unitId];
      if (!currentUnit) return;

      // 2. Update local state immediately (optimistic update)
      const updatedQuestions = currentUnit.questions.map(q =>
        q.id === questionId ? { ...q, ...updates } : q
      );

      const updatedUnit = { ...currentUnit, questions: updatedQuestions };

      setLoadedUnits(prev => ({
        ...prev,
        [unitId]: updatedUnit
      }));

      // 3. Update Firestore
      const unitRef = doc(db, "subjects", subjectId, "units", unitId);
      await updateDoc(unitRef, {
        questions: updatedQuestions
      });

    } catch (err) {
      console.error("Error updating question:", err);
      alert("Failed to save changes. Please try again.");
      // Revert local state if needed (not implemented for simplicity, but recommended for robust apps)
    }
  };

  const { progressMap, updateStatus, toggleStar, saveNote, getNote, loading: progressLoading } = useProgress(subjectId);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const fetchSubjectData = async () => {
      try {
        // Only fetch metadata initially
        const metaSnap = await getDoc(doc(db, "subjects", subjectId));

        if (metaSnap.exists()) {
          setMetadata({ id: metaSnap.id, ...metaSnap.data() } as SubjectMetadata);
        } else {
          setError("Subject not found");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error fetching subject:", err);
        setError("Failed to load subject data");
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectData();
  }, [subjectId]);

  if (loading || progressLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900/50" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900/50" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Error Loading Subject</h2>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">{error || "Subject not found"}</p>
        <Link href="/" className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
          Return Home
        </Link>
      </div>
    );
  }

  // Calculate stats
  const totalQuestions = metadata.questionCount;
  const completedCount = Object.values(progressMap).filter(p => p.status !== null).length;
  const progress = totalQuestions === 0 ? 0 : Math.round((completedCount / totalQuestions) * 100);

  const handleExport = () => {
    if (!subject) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(subject, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${subject.title.replace(/\s+/g, '_')}_export.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Subjects
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{metadata.title}</h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {metadata.unitCount} Units
              </span>
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                {totalQuestions} Questions
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress Circle */}
            <div className="flex items-center gap-4 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/50">
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Progress</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{progress}%</p>
              </div>
              <div className="h-12 w-12">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-200 dark:text-zinc-800"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="text-indigo-600 dark:text-indigo-500 transition-all duration-1000 ease-out"
                    strokeDasharray={`${progress}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                </svg>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  isEditing
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                )}
              >
                <Settings className="h-4 w-4" />
                {isEditing ? 'Done Editing' : 'Edit Mode'}
              </button>
            )}
            {isAdmin && isEditing && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-lg bg-zinc-100 p-1 w-fit dark:bg-zinc-900">
          <button
            onClick={() => setActiveTab('questions')}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              activeTab === 'questions'
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            <ListChecks className="h-4 w-4" />
            Questions
          </button>
          <button
            onClick={() => setActiveTab('favourites')}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              activeTab === 'favourites'
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            <Star className="h-4 w-4" />
            Favourites
          </button>
          <button
            onClick={() => setActiveTab('syllabus')}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              activeTab === 'syllabus'
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            <BookOpen className="h-4 w-4" />
            Syllabus
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {activeTab === 'questions' || activeTab === 'favourites' ? (
          <div className="space-y-8">
            {metadata?.units.map((unitSummary) => {
              const isExpanded = expandedUnits.has(unitSummary.id);
              const unitData = loadedUnits[unitSummary.id];
              const isLoading = loadingUnit === unitSummary.id;

              // If expanded and loaded, use loaded questions. Otherwise empty array.
              let questionsToShow = unitData ? unitData.questions : [];

              // Filter questions if in favourites tab
              if (activeTab === 'favourites') {
                questionsToShow = questionsToShow.filter(q => progressMap[q.id]?.isStarred);
              }

              // Sort by frequency (descending)
              if (questionsToShow.length > 0) {
                questionsToShow = [...questionsToShow].sort((a, b) => b.frequency - a.frequency);
              }

              return (
                <div key={unitSummary.id} className="scroll-mt-24" id={unitSummary.id}>
                  <div
                    className="mb-6 cursor-pointer border-b border-zinc-200 pb-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                    onClick={() => toggleUnit(unitSummary.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {!isExpanded ? <ChevronDown className="h-5 w-5 text-zinc-400" /> : <ChevronUp className="h-5 w-5 text-zinc-400" />}
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{unitSummary.title}</h2>
                        {isLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />}
                      </div>
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        {unitSummary.questionCount} Questions
                      </span>
                    </div>
                    {unitSummary.topics && unitSummary.topics.length > 0 && !isExpanded && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                        {unitSummary.topics.map((topic, i) => (
                          <span key={i} className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isExpanded && unitData && (
                    <div className="grid gap-4">
                      {questionsToShow.map((question) => {
                        const qProgress = progressMap[question.id] || {};
                        return (
                          <QuestionItem
                            key={question.id}
                            question={question}
                            status={qProgress.status || null}
                            isStarred={!!qProgress.isStarred}
                            onStatusChange={updateStatus}
                            onStarToggle={toggleStar}
                            onNoteSave={saveNote}
                            getNote={getNote}
                            isEditing={isAdmin && isEditing}
                            onUpdate={(id, updates) => handleQuestionUpdate(unitSummary.id, id, updates)}
                            onLoadSolution={fetchSolution}
                            cachedSolution={loadedSolutions[question.id]}
                            subjectId={subjectId}
                            unitId={unitSummary.id}
                          />
                        );
                      })}

                      {questionsToShow.length === 0 && activeTab === 'favourites' && (
                        <p className="text-sm text-zinc-500 italic">No favourites in this unit.</p>
                      )}

                      {isAdmin && isEditing && activeTab === 'questions' && (
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
                        >
                          <Plus className="h-4 w-4" />
                          Add Question
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {isAdmin && isEditing && activeTab === 'questions' && (
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-6 text-sm font-medium text-zinc-500 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              >
                <Plus className="h-5 w-5" />
                Add New Unit
              </button>
            )}
          </div>
        ) : (
          metadata && <SyllabusView units={metadata.units} />
        )}
      </div>
    </div>
  );
}
