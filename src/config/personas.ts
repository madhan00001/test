import { PersonaConfig } from '../types';

export const PERSONAS: PersonaConfig[] = [
  {
    id: 'default',
    name: 'Maddy',
    tagline: 'Versatile, witty & insightful',
    description: 'The flagship AI companion. Warm, concise, intellectually sharp, and grounded in your documents.',
    iconName: 'Sparkles',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  },
  {
    id: 'architect',
    name: 'Code Architect',
    tagline: 'Production-grade software engineering',
    description: 'Expert in TypeScript, React, algorithms, system design, performance optimization, and clean code.',
    iconName: 'Code2',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'researcher',
    name: 'Research Analyst',
    tagline: 'Deep dive synthesis & structured logic',
    description: 'Focuses on objective truths, source citations, hypothesis testing, and academic rigor.',
    iconName: 'Search',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  {
    id: 'creative',
    name: 'Creative Muse',
    tagline: 'Narrative, brainstorming & copy',
    description: 'Vivid imagery, compelling storytelling, unique conceptual perspectives, and punchy copywriting.',
    iconName: 'Palette',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  },
  {
    id: 'executive',
    name: 'Executive Brief',
    tagline: 'High-signal summaries & action items',
    description: 'Ultra-concise, prioritized takeaways, impact analysis, and direct strategic steps.',
    iconName: 'Briefcase',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
];
