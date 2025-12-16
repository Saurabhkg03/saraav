import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Subject, UserProfile } from './types';

interface StudyState {
    subjects: Subject[];
    userProfile: UserProfile;
    addSubject: (subject: Subject) => void;
    updateQuestionStatus: (subjectId: string, unitId: string, questionId: string, isChecked: boolean) => void;
    updateQuestionText: (subjectId: string, unitId: string, questionId: string, text: string) => void;
    addQuestion: (subjectId: string, unitId: string) => void;
    deleteQuestion: (subjectId: string, unitId: string, questionId: string) => void;
    addUnit: (subjectId: string) => void;
    deleteUnit: (subjectId: string, unitId: string) => void;
    deleteSubject: (subjectId: string) => void;
    updateUserProfile: (profile: Partial<UserProfile>) => void;
}

export const useStudyStore = create<StudyState>()(
    persist(
        (set) => ({
            subjects: [],
            userProfile: {
                uid: 'mock-uid',
                displayName: 'Student',
                photoURL: null,
                email: 'student@example.com',
                progress: {}
            },
            addSubject: (subject) =>
                set((state) => ({ subjects: [...state.subjects, subject] })),
            updateQuestionStatus: (subjectId, unitId, questionId, isChecked) =>
                set((state) => {
                    const newSubjects = state.subjects.map((subject) => {
                        if (subject.id !== subjectId) return subject;
                        return {
                            ...subject,
                            units: subject.units.map((unit) => {
                                if (unit.id !== unitId) return unit;
                                return {
                                    ...unit,
                                    questions: unit.questions.map((q) => {
                                        if (q.id !== questionId) return q;
                                        return { ...q, isChecked };
                                    }),
                                };
                            }),
                        };
                    });

                    return {
                        subjects: newSubjects,
                    };
                }),
            updateQuestionText: (subjectId, unitId, questionId, text) =>
                set((state) => ({
                    subjects: state.subjects.map((s) =>
                        s.id === subjectId
                            ? {
                                ...s,
                                units: s.units.map((u) =>
                                    u.id === unitId
                                        ? {
                                            ...u,
                                            questions: u.questions.map((q) =>
                                                q.id === questionId ? { ...q, text } : q
                                            ),
                                        }
                                        : u
                                ),
                            }
                            : s
                    ),
                })),
            addQuestion: (subjectId, unitId) =>
                set((state) => ({
                    subjects: state.subjects.map((s) =>
                        s.id === subjectId
                            ? {
                                ...s,
                                units: s.units.map((u) =>
                                    u.id === unitId
                                        ? {
                                            ...u,
                                            questions: [
                                                ...u.questions,
                                                {
                                                    id: crypto.randomUUID(),
                                                    text: 'New Question',
                                                    frequency: 0,
                                                    isChecked: false,
                                                },
                                            ],
                                        }
                                        : u
                                ),
                            }
                            : s
                    ),
                })),
            deleteQuestion: (subjectId, unitId, questionId) =>
                set((state) => ({
                    subjects: state.subjects.map((s) =>
                        s.id === subjectId
                            ? {
                                ...s,
                                units: s.units.map((u) =>
                                    u.id === unitId
                                        ? {
                                            ...u,
                                            questions: u.questions.filter((q) => q.id !== questionId),
                                        }
                                        : u
                                ),
                            }
                            : s
                    ),
                })),
            addUnit: (subjectId) =>
                set((state) => ({
                    subjects: state.subjects.map((s) =>
                        s.id === subjectId
                            ? {
                                ...s,
                                units: [
                                    ...s.units,
                                    {
                                        id: crypto.randomUUID(),
                                        title: 'New Unit',
                                        topics: [],
                                        questions: [],
                                    },
                                ],
                            }
                            : s
                    ),
                })),
            deleteUnit: (subjectId, unitId) =>
                set((state) => ({
                    subjects: state.subjects.map((s) =>
                        s.id === subjectId
                            ? {
                                ...s,
                                units: s.units.filter((u) => u.id !== unitId),
                            }
                            : s
                    ),
                })),
            deleteSubject: (subjectId) =>
                set((state) => ({
                    subjects: state.subjects.filter((s) => s.id !== subjectId),
                })),
            updateUserProfile: (profile) =>
                set((state) => ({
                    userProfile: { ...state.userProfile, ...profile },
                })),
        }),
        {
            name: 'study-tracker-storage',
            partialize: (state) => ({ userProfile: state.userProfile }),
        }
    )
);
