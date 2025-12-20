import { useState } from 'react';
import { X, Upload, AlertCircle, FileJson, AlertTriangle } from 'lucide-react';
import { doc, writeBatch, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Subject, SubjectMetadata } from '@/lib/types';
import { updateBundle } from '@/lib/bundleUtils';

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
    // New state for additional fields
    const [price, setPrice] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [isElective, setIsElective] = useState(false);
    const [electiveCategory, setElectiveCategory] = useState('');

    const [error, setError] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);

    // Conflict State
    const [conflict, setConflict] = useState<{
        type: 'id' | 'duplicate';
        existingSubject: SubjectMetadata;
        payload: Subject;
    } | null>(null);

    // Rename state for conflict resolution
    const [renameTitle, setRenameTitle] = useState('');

    if (!isOpen) return null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                // Validate it's JSON
                const parsed = JSON.parse(content);
                setJsonInput(content);

                // Pre-fill fields if present in JSON
                // REMOVED: User wants to manually select branch/semester to avoid errors from JSON
                // if (parsed.branch) setBranch(parsed.branch);
                // if (parsed.semester) setSemester(parsed.semester);
                if (parsed.price !== undefined) setPrice(parsed.price.toString());
                if (parsed.originalPrice !== undefined) setOriginalPrice(parsed.originalPrice.toString());
                if (parsed.isElective !== undefined) setIsElective(parsed.isElective);
                if (parsed.electiveCategory) setElectiveCategory(parsed.electiveCategory);

                setError(null);
            } catch (err) {
                setError("Invalid JSON file");
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    const executeImport = async (finalSubject: Subject) => {
        try {
            setImporting(true);

            // Create metadata with unit summaries
            const metadata: SubjectMetadata = {
                id: finalSubject.id,
                title: finalSubject.title,
                branch: finalSubject.branch,
                semester: finalSubject.semester,
                year: finalSubject.year,
                price: finalSubject.price,
                originalPrice: finalSubject.originalPrice,
                isElective: finalSubject.isElective,
                electiveCategory: finalSubject.electiveCategory,
                unitCount: finalSubject.units.length,
                questionCount: finalSubject.units.reduce((acc, u) => acc + u.questions.length, 0),
                units: finalSubject.units.map(u => ({
                    id: u.id,
                    title: u.title,
                    questionCount: u.questions.length,
                    topics: u.topics
                }))
            };

            // Batch write: Metadata + Individual Units
            const batch = writeBatch(db);

            // 1. Save Metadata to lightweight collection
            const metadataRef = doc(db, "subjects_metadata", finalSubject.id);
            batch.set(metadataRef, metadata);

            // 1b. Save Metadata to main collection (for backward compatibility / full access)
            const subjectRef = doc(db, "subjects", finalSubject.id);
            batch.set(subjectRef, metadata);

            // 2. Save Each Unit and its Solutions
            finalSubject.units.forEach(unit => {
                // Process questions to extract solutions
                const processedQuestions = unit.questions.map(q => {
                    const { solution, ...rest } = q;

                    // If solution exists, save it to 'solutions' collection
                    if (solution) {
                        const solutionRef = doc(db, "subjects", finalSubject.id, "solutions", q.id);
                        batch.set(solutionRef, { text: solution });
                    }

                    return {
                        ...rest,
                        hasSolution: !!solution // Set flag
                    };
                });

                const unitRef = doc(db, "subjects", finalSubject.id, "units", unit.id);
                batch.set(unitRef, { ...unit, questions: processedQuestions });
            });

            // 3. Delete legacy content doc if it exists (cleanup)
            const legacyRef = doc(db, "subject_contents", finalSubject.id);
            batch.delete(legacyRef);

            await batch.commit();

            // Sync Bundles (Client-Side Automation)
            await updateBundle(finalSubject.branch, finalSubject.semester);

            onClose();
            // Force reload or notify parent
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to parse JSON");
        } finally {
            setImporting(false);
            setConflict(null);
        }
    };

    const handleImportCheck = async () => {
        try {
            setError(null);
            setImporting(true); // Temporary loading state for checks
            const parsed = JSON.parse(jsonInput);

            // Basic validation
            if (!parsed.title || !Array.isArray(parsed.units)) {
                throw new Error("Invalid JSON structure. Missing 'title' or 'units' array.");
            }

            if (!branch || !semester) {
                throw new Error("Please select a Branch and Semester.");
            }
            const resolvedSemester = semester;
            const resolvedBranch = branch;
            const derivedYear = getYearFromSemester(resolvedSemester);

            const { id: parsedId, branch: _b, semester: _s, year: _y, ...parsedRest } = parsed;
            const finalId = parsedId || crypto.randomUUID();

            const subjectPayload: Subject = {
                ...parsedRest,
                id: finalId,
                branch: resolvedBranch,
                semester: resolvedSemester,
                year: derivedYear,
                price: price ? parseFloat(price) : (parsed.price || 0),
                originalPrice: originalPrice ? parseFloat(originalPrice) : (parsed.originalPrice || 0),
                isElective: isElective,
                electiveCategory: isElective ? electiveCategory : '',

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                units: parsed.units.map((u: any) => {
                    const { id: uId, ...uRest } = u;
                    return {
                        ...uRest,
                        id: uId || crypto.randomUUID(),
                        topics: u.topics || [],
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        questions: u.questions?.map((q: any) => {
                            const { id: qId, ...qRest } = q;
                            return {
                                ...qRest,
                                id: qId || crypto.randomUUID(),
                                isChecked: false,
                                hasDiagram: q.hasDiagram || 0,
                                history: q.history || []
                            };
                        }) || []
                    };
                })
            };

            // CHECK 1: ID Conflict
            if (parsed.id) {
                const docSnap = await getDoc(doc(db, "subjects_metadata", parsed.id));
                if (docSnap.exists()) {
                    const existingData = { id: docSnap.id, ...docSnap.data() } as SubjectMetadata;
                    setConflict({
                        type: 'id',
                        existingSubject: existingData,
                        payload: subjectPayload
                    });
                    setRenameTitle(subjectPayload.title); // Init rename
                    setImporting(false);
                    return;
                }
            }

            // CHECK 2: Duplicate Content (Title + Branch + Semester)
            // Only check if we didn't just find an ID conflict
            const q = query(
                collection(db, "subjects_metadata"),
                where("title", "==", subjectPayload.title),
                where("branch", "==", subjectPayload.branch),
                where("semester", "==", subjectPayload.semester)
            );
            const querySnap = await getDocs(q);

            if (!querySnap.empty) {
                const existing = querySnap.docs[0].data() as SubjectMetadata;
                const { id: existingDataId, ...restOfExistingData } = existing; // Destructure id from existing data
                // If the IDs match, it would have been caught by ID check (unless ID was missing in input but generated same? Unlikely).
                // Usually this catches "Same Name but New/Different ID" or "Same Name but Input has NO ID"
                setConflict({
                    type: 'duplicate',
                    existingSubject: { id: querySnap.docs[0].id, ...restOfExistingData },
                    payload: subjectPayload
                });
                setRenameTitle(subjectPayload.title);
                setImporting(false);
                return;
            }

            // No conflicts, proceed
            await executeImport(subjectPayload);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to check JSON");
            setImporting(false);
        }
    };

    const resolveConflict = (action: 'overwrite' | 'new' | 'rename') => {
        if (!conflict) return;

        let finalPayload = { ...conflict.payload };

        if (action === 'rename') {
            // Rename implies we treat it as NEW or OVERWRITE?
            // User likely wants to Save As New with a different name.
            // Or they might want to Rename the *current* import and still overwrite? No that's confusing.
            // "Edit Name" usually means "I want to import this as a NEW subject, but change its name so it doesn't collide".
            // OR "I want to overwrite the existing one but update its title".

            // Simplest Interpretation: Update the title of the payload.
            // Then, do they want to OVERWRITE the existing ID with this new title?
            // Or CREATE NEW ID with this new title?

            // Let's assume Rename -> Create NEW with new name (safest).
            // Actually, let's just update the payload title and then ask them to pick 'Overwrite' or 'New' again?
            // Integrating "Rename" as a modifier.

            finalPayload.title = renameTitle;
            // Now what? If they clicked "Rename and Import as New":
            finalPayload.id = crypto.randomUUID(); // Force new ID
            executeImport(finalPayload);
            return;
        }

        if (action === 'overwrite') {
            // Force ID to match existing
            finalPayload.id = conflict.existingSubject.id;
            // Title should match payload (which might have been edited in rename field?)
            // If they edited the name in the conflict dialog, update it.
            if (renameTitle !== conflict.payload.title) {
                finalPayload.title = renameTitle;
            }
            executeImport(finalPayload);
        } else if (action === 'new') {
            // Force new ID
            finalPayload.id = crypto.randomUUID();
            // Update title if edited
            if (renameTitle !== conflict.payload.title) {
                finalPayload.title = renameTitle;
            }
            executeImport(finalPayload);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            {conflict ? (
                <div className="w-full max-w-lg rounded-xl border border-yellow-700/50 bg-zinc-950 p-6 shadow-2xl animate-in zoom-in-95">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 rounded-full bg-yellow-900/20 text-yellow-500">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-zinc-100">
                                {conflict.type === 'id' ? 'ID Conflict Detected' : 'Duplicate Subject Detected'}
                            </h3>
                            <p className="text-sm text-zinc-400 mt-1">
                                A subject with the same {conflict.type === 'id' ? 'ID' : 'Name, Branch, and Semester'} already exists.
                            </p>
                            <div className="mt-3 p-3 rounded bg-zinc-900 border border-zinc-800 text-sm">
                                <p><span className="text-zinc-500">Existing:</span> <span className="text-zinc-200">{conflict.existingSubject.title}</span> <span className="text-zinc-600 text-xs">({conflict.existingSubject.id})</span></p>
                                <p className="mt-1"><span className="text-zinc-500">Importing:</span> <span className="text-zinc-200">{conflict.payload.title}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Edit Import Title (Optional)
                            </label>
                            <input
                                type="text"
                                value={renameTitle}
                                onChange={(e) => setRenameTitle(e.target.value)}
                                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={() => resolveConflict('overwrite')}
                                className="w-full rounded-lg bg-red-600/10 border border-red-900/30 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-600/20 transition-colors text-left flex items-center justify-between group"
                            >
                                <span>
                                    <span className="block font-semibold">Overwrite Existing</span>
                                    <span className="block text-xs opacity-70">Replace the existing subject content completely.</span>
                                </span>
                                <AlertCircle className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                            </button>

                            <button
                                onClick={() => resolveConflict('new')}
                                className="w-full rounded-lg bg-indigo-600/10 border border-indigo-900/30 px-4 py-3 text-sm font-medium text-indigo-400 hover:bg-indigo-600/20 transition-colors text-left"
                            >
                                <span className="block font-semibold">Import as New</span>
                                <span className="block text-xs opacity-70">Generate a new ID and keep both subjects.</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 mt-2 border-t border-zinc-800">
                        <button
                            onClick={() => {
                                setConflict(null);
                                setImporting(false);
                            }}
                            className="text-sm text-zinc-500 hover:text-zinc-300"
                        >
                            Cancel Import
                        </button>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
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
                                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                                    <option value="Electrical Engineering">Electrical Engineering</option>
                                    <option value="Common Electives">Common Electives</option>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                                    Price (Discounted)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-zinc-500">₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full rounded-lg border border-zinc-700 bg-black/50 pl-7 pr-3 py-2 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                                    Original Price
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-zinc-500">₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={originalPrice}
                                        onChange={(e) => setOriginalPrice(e.target.value)}
                                        className="w-full rounded-lg border border-zinc-700 bg-black/50 pl-7 pr-3 py-2 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-zinc-800">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isElectiveImport"
                                    checked={isElective}
                                    onChange={(e) => setIsElective(e.target.checked)}
                                    className="h-4 w-4 rounded border-zinc-700 bg-black/50 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="isElectiveImport" className="text-sm font-medium text-zinc-300">
                                    This is an Elective Subject
                                </label>
                            </div>

                            {isElective && (
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                                        Elective Category
                                    </label>
                                    <div className="space-y-2">
                                        <select
                                            value={electiveCategory}
                                            onChange={(e) => setElectiveCategory(e.target.value)}
                                            className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none"
                                        >
                                            <option value="">Select Category</option>
                                            <option value="Elective I">Elective I</option>
                                            <option value="Elective II">Elective II</option>
                                            <option value="Elective III">Elective III</option>
                                            <option value="Open Elective I">Open Elective I</option>
                                            <option value="Open Elective II">Open Elective II</option>
                                        </select>
                                        <input
                                            type="text"
                                            placeholder="Or type custom category..."
                                            value={electiveCategory}
                                            onChange={(e) => setElectiveCategory(e.target.value)}
                                            className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
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
                            className="h-48 w-full rounded bg-black/50 p-4 font-mono text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 rounded bg-red-900/20 p-3 text-sm text-red-300 border border-red-900/50 mt-4">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6">
                        <button
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImportCheck}
                            disabled={!jsonInput.trim() || importing}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Upload className="h-4 w-4" />
                            {importing ? 'Checking...' : 'Import Subject'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
