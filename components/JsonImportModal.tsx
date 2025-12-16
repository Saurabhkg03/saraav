import { useState } from 'react';
import { X, Upload, AlertCircle, FileJson } from 'lucide-react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Subject, SubjectMetadata } from '@/lib/types';

interface JsonImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Helper to derive year
function getYearFromSemester(semester: string): string {
    if (!semester) return '';
    const match = semester.match(/\d+/);
    if (!match) return '';
    const semNum = parseInt(match[0]);
    if (semNum <= 2) return 'First Year';
    if (semNum <= 4) return 'Second Year';
    if (semNum <= 6) return 'Third Year';
    return 'Fourth Year';
}

export function JsonImportModal({ isOpen, onClose }: JsonImportModalProps) {
    const [jsonInput, setJsonInput] = useState('');
    const [branch, setBranch] = useState('');
    const [semester, setSemester] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);

    if (!isOpen) return null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                // Validate it's JSON
                JSON.parse(content);
                setJsonInput(content);
                setError(null);
            } catch (err) {
                setError("Invalid JSON file");
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        try {
            setError(null);
            setImporting(true);
            const parsed = JSON.parse(jsonInput);

            // Basic validation
            if (!parsed.title || !Array.isArray(parsed.units)) {
                throw new Error("Invalid JSON structure. Missing 'title' or 'units' array.");
            }

            // Ensure ID exists
            const subjectId = parsed.id || crypto.randomUUID();
            const resolvedSemester = semester || parsed.semester || '';
            const resolvedBranch = branch || parsed.branch || '';
            const derivedYear = parsed.year || getYearFromSemester(resolvedSemester);

            const subject: Subject = {
                ...parsed,
                id: subjectId,
                branch: resolvedBranch,
                semester: resolvedSemester,
                year: derivedYear,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                units: parsed.units.map((u: any) => ({
                    ...u,
                    id: u.id || crypto.randomUUID(),
                    topics: u.topics || [], // Map topics
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    questions: u.questions?.map((q: any) => ({
                        ...q,
                        id: q.id || crypto.randomUUID(),
                        isChecked: false, // Reset isChecked for global seed
                        hasDiagram: q.hasDiagram || 0,
                        history: q.history || []
                    })) || []
                }))
            };

            // Create metadata with unit summaries
            const metadata: SubjectMetadata = {
                id: subjectId,
                title: subject.title,
                branch: subject.branch,
                semester: subject.semester,
                year: subject.year,
                unitCount: subject.units.length,
                questionCount: subject.units.reduce((acc, u) => acc + u.questions.length, 0),
                units: subject.units.map(u => ({
                    id: u.id,
                    title: u.title,
                    questionCount: u.questions.length,
                    topics: u.topics
                }))
            };

            // Batch write: Metadata + Individual Units
            const batch = writeBatch(db);

            // 1. Save Metadata to lightweight collection
            const metadataRef = doc(db, "subjects_metadata", subjectId);
            batch.set(metadataRef, metadata);

            // 1b. Save Metadata to main collection (for backward compatibility / full access)
            const subjectRef = doc(db, "subjects", subjectId);
            batch.set(subjectRef, metadata);

            // 2. Save Each Unit and its Solutions
            subject.units.forEach(unit => {
                // Process questions to extract solutions
                const processedQuestions = unit.questions.map(q => {
                    const { solution, ...rest } = q;

                    // If solution exists, save it to 'solutions' collection
                    if (solution) {
                        const solutionRef = doc(db, "subjects", subjectId, "solutions", q.id);
                        batch.set(solutionRef, { text: solution });
                    }

                    return {
                        ...rest,
                        hasSolution: !!solution // Set flag
                    };
                });

                const unitRef = doc(db, "subjects", subjectId, "units", unit.id);
                batch.set(unitRef, { ...unit, questions: processedQuestions });
            });

            // 3. Delete legacy content doc if it exists (cleanup)
            const legacyRef = doc(db, "subject_contents", subjectId);
            batch.delete(legacyRef);

            await batch.commit();

            onClose();
            // Force reload or notify parent
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to parse JSON");
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-zinc-100">Import Subject from JSON</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                                Branch
                            </label>
                            <select
                                value={branch}
                                onChange={(e) => setBranch(e.target.value)}
                                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none"
                            >
                                <option value="">Select Branch</option>
                                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                                <option value="Information Technology">Information Technology</option>
                                <option value="Electronics & Telecommunication">Electronics & Telecommunication</option>
                                <option value="Civil Engineering">Civil Engineering</option>
                                <option value="Mechanical Engineering">Mechanical Engineering</option>
                                <option value="Electrical Engineering">Electrical Engineering</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                                Semester
                            </label>
                            <select
                                value={semester}
                                onChange={(e) => setSemester(e.target.value)}
                                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none"
                            >
                                <option value="">Select Semester</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                                    <option key={sem} value={`Semester ${sem}`}>
                                        Semester {sem}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-400">
                            Paste JSON below or upload a file.
                        </p>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">
                            <FileJson className="h-3.5 w-3.5" />
                            Upload JSON File
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </label>
                    </div>
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder='{ "title": "Subject Name", "units": [...] }'
                        className="h-64 w-full rounded bg-black/50 p-4 font-mono text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                </div>

                {error && (
                    <div className="flex items-center gap-2 rounded bg-red-900/20 p-3 text-sm text-red-300 border border-red-900/50">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!jsonInput.trim() || importing}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Upload className="h-4 w-4" />
                        {importing ? 'Importing...' : 'Import Subject'}
                    </button>
                </div>
            </div>
        </div>
    );
}
