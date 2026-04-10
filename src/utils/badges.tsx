/**
 * Badge icon and rarity color mappings
 */
import {
    Award, BookOpen, CheckCircle, Library, Trophy, Flame,
    Flag, Book, Zap, Layers, Database, Timer, CalendarCheck, Crown, Target, Star, Medal
} from 'lucide-react';
import React from 'react';

export const BADGE_ICONS: Record<string, React.ReactNode> = {
    'flag': <Flag size={32} />,
    'book': <Book size={32} />,
    'book-open': <BookOpen size={32} />,
    'flame': <Flame size={32} />,
    'zap': <Zap size={32} />,
    'library': <Library size={32} />,
    'layers': <Layers size={32} />,
    'database': <Database size={32} />,
    'timer': <Timer size={32} />,
    'calendar-check': <CalendarCheck size={32} />,
    'crown': <Crown size={32} />,
    'check-circle': <CheckCircle size={32} />,
    'target': <Target size={32} />,
    'star': <Star size={32} />,
    'medal': <Medal size={32} />,
    'award': <Award size={32} />,
    'trophy': <Trophy size={32} />,
};


export const RARITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'common': { bg: '#6b7280', text: '#fff', border: '#4b5563' },       // Gray
    'rare': { bg: '#3b82f6', text: '#fff', border: '#2563eb' },         // Blue
    'epic': { bg: '#8b5cf6', text: '#fff', border: '#7c3aed' },         // Purple
    'legendary': { bg: 'linear-gradient(135deg, #ffd700, #ff8c00)', text: '#000', border: '#ffd700' }, // Gold gradient
};


export function getBadgeIcon(iconName: string | undefined): React.ReactNode {
    if (!iconName) return <Star size={32} />;
    const normalized = iconName.toLowerCase().trim();
    return BADGE_ICONS[normalized] || <Star size={32} />;
}


export function getBadgeColors(rarity: string | undefined): { bg: string; text: string; border: string } {
    if (!rarity) return RARITY_COLORS['common'];
    return RARITY_COLORS[rarity.toLowerCase()] || RARITY_COLORS['common'];
}
