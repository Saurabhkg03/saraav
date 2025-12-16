import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Helper to get initials from title, ignoring '&'
export const getInitials = (title: string) => {
    return title
        .split(' ')
        .filter(word => word !== '&') // Ignore ampersand
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);
};

// Helper to get consistent color from string
export const getColorClass = (title: string) => {
    const colors = [
        'from-pink-500 to-rose-500',
        'from-purple-500 to-indigo-500',
        'from-blue-500 to-cyan-500',
        'from-teal-500 to-emerald-500',
        'from-orange-500 to-amber-500',
        'from-red-500 to-orange-500',
    ];
    const index = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
};
