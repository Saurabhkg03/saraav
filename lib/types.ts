export type Question = {
    id: string;
    text: string; // Supports Markdown + LaTeX
    frequency: number;
    isChecked: boolean; // Deprecated in favor of status, kept for backward compatibility if needed
    solution?: string; // Markdown + LaTeX supported
    hasSolution?: boolean; // Flag to indicate if solution exists (for lazy loading)
    video?: {
        videoId: string;
        title: string;
        channelTitle: string;
        searchQuery: string;
    };
    hasDiagram?: number; // 0 or 1
    history?: {
        year: string;
        marks: string;
    }[];
    questionImageUrl?: string;
    solutionImageUrl?: string;
    images?: Record<string, string[]>; // Map index (string) -> array of image URLs
};

export type Unit = {
    id: string;
    title: string;
    topics?: string[];
    questions: Question[];
};

export type Subject = {
    id: string;
    title: string; // e.g., "Project Management"
    branch?: string;
    semester?: string;
    year?: string;
    price?: number;
    originalPrice?: number;
    isElective?: boolean;
    electiveCategory?: string; // e.g., "Elective I", "Elective II"
    units: Unit[];
};

export type UnitSummary = {
    id: string;
    title: string;
    questionCount: number;
    topics?: string[];
};

export interface SubjectMetadata {
    id: string;
    title: string;
    branch?: string;
    semester?: string;
    year?: string;
    price?: number;
    originalPrice?: number;
    isElective?: boolean;
    electiveCategory?: string;
    unitCount: number;
    questionCount: number;
    units: UnitSummary[]; // Lightweight summary for initial load
}

export type QuestionStatus = 'easy' | 'medium' | 'hard' | null;

export interface QuestionProgress {
    status: QuestionStatus;
    lastReviewed?: number; // Timestamp (milliseconds)
    nextReview?: number;   // Timestamp (milliseconds)
    isStarred?: boolean;
}

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    branch?: string;
    year?: string;
    progress: {
        [subjectId: string]: {
            questions: { [questionId: string]: QuestionProgress }
        }
    };
    purchases?: Record<string, {
        purchaseDate: number; // Timestamp
        expiryDate: number;   // Timestamp
        durationMonths: number;
    }>;
    hasSeenWelcomeModal?: boolean;
}

export type ReportReason = 'wrong_answer' | 'missing_content' | 'typo' | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface Report {
    id: string;
    questionId: string;
    userId?: string; // Optional if anonymous reporting is allowed
    userEmail?: string;
    reason: ReportReason;
    description?: string;
    status: ReportStatus;
    createdAt: number; // Timestamp
    // Optional: Snapshot of the question at the time of reporting
    questionSnapshot?: {
        text: string;
        subjectId?: string; // To help admin locate it
        unitId?: string;
        history?: {
            year: string;
            marks: string;
        }[];
        solution?: string;
    }
}
