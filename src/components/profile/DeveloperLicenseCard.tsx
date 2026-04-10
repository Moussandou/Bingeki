/**
 * Developer License Card component (profile)
 */
import { PenTool, Terminal as TerminalIcon, Book } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';


import styles from './HunterLicenseCard.module.css'; // Reusing styles

interface DeveloperLicenseCardProps {
    user: {
        uid: string;
        displayName: string;
        title: string;
        bio?: string;
        photoURL?: string;
        themeColor?: string;
        location?: string;
        email?: string;
        phone?: string;
    };
    stats: {
        uptime: string;
        projects: string;
        languages: string;
        experience: string;
        motivation: number; // Percentage
    };
    education: {
        school: string;
        degree: string;
        year: string;
    }[];
    projects: {
        title: string;
        desc: string;
        image?: string;
        tech?: string;
    }[];
    logs: string[]; // For the 'terminal' text lines
}

export function DeveloperLicenseCard({ user, stats, education, projects, logs }: DeveloperLicenseCardProps) {
    // Bingeki Theme Constants
    const borderColor = '#000';
    const accentColor = '#FF2E63';
    const bgColor = '#fff';
    const textColor = '#000';

    return (
        <div className="manga-panel" style={{
            padding: '0',
            overflow: 'hidden',
            background: bgColor,
            color: textColor,
            position: 'relative',
            border: `3px solid ${borderColor}`,
            fontFamily: 'var(--font-body)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%' // Ensure it fills container if needed
        }}>

            {/* Top Header Strip */}
            <div style={{ background: borderColor, color: '#fff', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', height: '40px' }}>
                <span style={{ fontWeight: 900, letterSpacing: '2px', fontFamily: 'var(--font-heading)' }}>DEVELOPER ID</span>
                <div style={{ display: 'flex', gap: '0.5rem', fontWeight: 900 }}>
                    v2.0
                </div>
            </div>

            <div style={{ display: 'flex', height: 'auto', minHeight: '400px' }}>
                {/* LEFT COLUMN: Profile & Key Stats (Approx 30%) */}
                <div style={{
                    width: '320px',
                    borderRight: `3px solid ${borderColor}`,
                    background: '#f8f8f8',
                    display: 'flex',
                    flexDirection: 'column',
                    textAlign: 'center',
                    flexShrink: 0
                }}>
                    {/* Banner / Header Bg */}
                    <div style={{
                        height: '80px',
                        background: user.themeColor || accentColor,
                        borderBottom: `2px solid ${borderColor}`,
                        position: 'relative',
                        marginBottom: '3rem' // Space for avatar overlap
                    }}>
                        <div className="manga-halftone" style={{ opacity: 0.1 }}></div>
                        {/* Avatar centered over line */}
                        <div className={styles.avatarContainer} style={{ position: 'absolute', bottom: '-40px', left: '50%', transform: 'translateX(-50%)', margin: 0 }}>
                            <div className={styles.avatarBox} style={{ border: `3px solid ${borderColor}`, width: '80px', height: '80px' }}>
                                <OptimizedImage
                                    src={user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.displayName}`}
                                    alt={user.displayName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div >
                        </div>
                    </div>

                    <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* Name & Title */}
                        <h2 className={styles.name} style={{ color: textColor, margin: '0', fontSize: '1.4rem' }}>{user.displayName}</h2>

                        <div style={{ display: 'inline-block', margin: '0.5rem auto', background: '#000', color: '#fff', padding: '0.2rem 0.8rem', fontWeight: 700, fontSize: '0.8rem', borderRadius: '12px' }}>
                            {user.title}
                        </div>

                        <p className={styles.idText} style={{ marginBottom: '0.2rem' }}>RES: {user.location?.toUpperCase()}</p>
                        <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>{user.email}</p>

                        <div style={{ flex: 1 }} /> {/* Spacer */}

                        {/* Mini Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1.5rem', textAlign: 'center' }}>
                            <div style={{ border: `2px solid ${borderColor}`, padding: '0.5rem', background: '#fff' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 900 }}>{stats.uptime}</div>
                                <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', opacity: 0.7 }}>Uptime</div>
                            </div>
                            <div style={{ border: `2px solid ${borderColor}`, padding: '0.5rem', background: '#fff' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 900 }}>{stats.projects}</div>
                                <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', opacity: 0.7 }}>Projets</div>
                            </div>
                            <div style={{ border: `2px solid ${borderColor}`, padding: '0.5rem', background: '#fff' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 900 }}>{stats.languages}</div>
                                <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', opacity: 0.7 }}>Langs</div>
                            </div>
                            <div style={{ border: `2px solid ${borderColor}`, padding: '0.5rem', background: '#fff' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 900 }}>{stats.experience}</div>
                                <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', opacity: 0.7 }}>EXP</div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* RIGHT COLUMN: Content (Projects, Terminal, Etc) */}
                <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Top Row: Projects & Education */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem' }}>

                        {/* Projects */}
                        <div>
                            <h3 style={{
                                fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase',
                                borderBottom: `2px solid ${accentColor}`, paddingBottom: '0.5rem', marginBottom: '0.8rem',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}>
                                <PenTool size={14} /> Projets Récents
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {projects.map((proj, i) => (
                                    <div key={i} style={{
                                        border: `1px solid #e0e0e0`, padding: '0.8rem', borderRadius: '4px',
                                        background: '#fff', boxShadow: '2px 2px 0 rgba(0,0,0,0.05)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{proj.title}</div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{proj.desc}</div>
                                        </div>
                                        <div style={{ fontSize: '0.6rem', background: '#000', color: '#fff', padding: '2px 6px', borderRadius: '2px', fontWeight: 600 }}>
                                            {proj.tech?.split('/')[0]}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Education */}
                        <div>
                            <h3 style={{
                                fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase',
                                borderBottom: `2px solid ${accentColor}`, paddingBottom: '0.5rem', marginBottom: '0.8rem',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}>
                                <Book size={14} /> Formation
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {education.map((edu, i) => (
                                    <div key={i} style={{ position: 'relative', paddingLeft: '1rem' }}>
                                        <div style={{ position: 'absolute', left: 0, top: '5px', width: '6px', height: '6px', background: accentColor, borderRadius: '50%' }} />
                                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{edu.degree}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{edu.school}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{edu.year}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Terminal & Motivation */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: 'auto' }}>
                        {/* Terminal */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <TerminalIcon size={12} /> SYSTEM_LOGS
                            </h3>
                            <div style={{
                                background: '#1e1e1e', color: '#33ff00', padding: '0.8rem',
                                fontFamily: 'monospace', fontSize: '0.7rem', borderRadius: '4px',
                                border: '2px solid #000', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center'
                            }}>
                                {logs.map((log, i) => (
                                    <div key={i} style={{ opacity: i === 0 ? 0.7 : 1, lineHeight: 1.4 }}>{log}</div>
                                ))}
                                <div className="typewriter-cursor">_</div>
                            </div>
                        </div>

                        {/* Motivation */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontWeight: 700, fontSize: '0.75rem' }}>
                                <span>MOTIVATION_LEVEL</span>
                                <span>{stats.motivation}%</span>
                            </div>
                            <div style={{ height: '14px', background: '#eee', border: `2px solid ${borderColor}`, borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${stats.motivation}%`,
                                    background: `linear-gradient(90deg, ${accentColor}, #ff6b6b)`
                                }} />
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', opacity: 0.5, textAlign: 'right' }}>
                                root@moussandou:~# ./portfolio_v2 --render
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div >
    );
}
