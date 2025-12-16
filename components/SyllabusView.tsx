import { UnitSummary } from '@/lib/types';

interface SyllabusViewProps {
    units: UnitSummary[];
}

export function SyllabusView({ units }: SyllabusViewProps) {
    return (
        <div className="space-y-8">
            {units.map((unit) => (
                <div key={unit.id} className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/30">
                    <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {unit.title}
                    </h3>
                    <ul className="space-y-3">
                        {(unit.topics || []).map((topic, index) => (
                            <li key={index} className="flex items-start gap-3 text-zinc-600 dark:text-zinc-400">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                                <span className="leading-relaxed">{topic}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}