import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { HunterLicenseCard } from '@/components/profile/HunterLicenseCard';
import { XPBar } from '@/components/gamification/XPBar';
import { Home, Book, Search, MessageSquare, Calendar, User, Flame, Star, Heart, Zap, Shield } from 'lucide-react';
import { DeveloperLicenseCard } from '@/components/profile/DeveloperLicenseCard';

import { BingekiBanner } from '@/components/ui/BingekiBanner';
import { ComparisonTable } from '@/components/ui/ComparisonTable';
import { MockupBrowser, MockupPhone } from '@/components/mockups/MockupBrowser';
import { MockupDashboard, MockupProfile, MockupDashboardMobile, MockupProfileMobile, MockupDiscover, MockupDiscoverMobile, MockupDetails, MockupDetailsMobile, MockupLibrary, MockupLibraryMobile, MockupSchedule, MockupScheduleMobile, MockupSocial, MockupSocialMobile, MockupAuth, MockupAuthMobile } from '@/components/mockups/PageLayouts';

export default function AssetsPage() {
    return (
        <div style={{ padding: '40px', background: '#f5f5f5', minHeight: '100vh', color: '#000' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '-2px', fontFamily: '"Outfit", sans-serif' }}>Visual Assets Gallery</h1>

                {/* SECTION: BRAND BANNER */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Brand Banner</h2>
                    <div style={{ width: '100%', border: '2px solid #000' }}>
                        <BingekiBanner style={{ height: '300px' }} />
                    </div>
                </section>

                {/* SECTION: COMPARISON TABLE */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Comparison Table</h2>
                    <ComparisonTable />
                </section>

                {/* SECTION: FONTS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Fonts</h2>
                    <div style={{ display: 'grid', gap: '2rem' }}>
                        <div>
                            <span style={{ fontSize: '0.9rem', opacity: 0.7, display: 'block', marginBottom: '0.5rem' }}>Primary Heading Font: <strong>Outfit</strong></span>
                            <div style={{ fontFamily: '"Outfit", sans-serif', fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>
                                ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
                                abcdefghijklmnopqrstuvwxyz<br />
                                0123456789
                            </div>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.9rem', opacity: 0.7, display: 'block', marginBottom: '0.5rem' }}>Body Font: <strong>Inter</strong></span>
                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '1.5rem', lineHeight: 1.5 }}>
                                The quick brown fox jumps over the lazy dog.<br />
                                0123456789
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION: BACKGROUND BRANDING */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Backgrounds & Textures</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        {/* Landing Page Background */}
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Landing Page (Tone & Speedlines)</h3>
                            <div style={{
                                width: '100%',
                                height: '300px',
                                position: 'relative',
                                border: '2px solid #000',
                                background: '#f4f4f4',
                                overflow: 'hidden'
                            }}>
                                {/* Halftone */}
                                <div style={{
                                    position: 'absolute', inset: 0, opacity: 0.1,
                                    backgroundImage: 'radial-gradient(#000 2px, transparent 2.5px)',
                                    backgroundSize: '20px 20px', pointerEvents: 'none'
                                }} />
                                {/* Speedlines */}
                                <div style={{
                                    position: 'absolute', inset: 0, opacity: 0.05,
                                    background: 'repeating-conic-gradient(from 0deg, transparent 0deg 10deg, #000 10deg 12deg)',
                                    pointerEvents: 'none'
                                }} />


                            </div>
                        </div>

                        {/* Speedlines Only */}
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Speedlines Overlay</h3>
                            <div style={{
                                width: '100%',
                                height: '300px',
                                position: 'relative',
                                border: '2px solid #000',
                                background: '#fff',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    position: 'absolute', inset: 0, opacity: 0.1,
                                    background: 'repeating-conic-gradient(from 0deg, transparent 0deg 10deg, #000 10deg 12deg)',
                                    pointerEvents: 'none'
                                }} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION: DASHBOARD WIDGETS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Dashboard Widgets</h2>

                    <div style={{ display: 'grid', gap: '2rem' }}>

                        {/* Stats HUD Row */}
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Stats HUD</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', maxWidth: '800px' }}>
                                {/* Daily Goal */}
                                <div className="manga-panel" style={{ padding: '1.5rem', background: '#fff' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                                        <Zap size={20} />
                                        <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Objectif</span>
                                    </div>
                                    <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>
                                        1<span style={{ fontSize: '1rem', opacity: 0.4 }}>/3</span>
                                    </div>
                                    <div style={{ width: '60px', height: '4px', background: '#eee', marginTop: '0.5rem', borderRadius: '2px' }}>
                                        <div style={{ width: '33%', height: '100%', background: '#FF2E63' }} />
                                    </div>
                                </div>

                                {/* Streak */}
                                <div className="manga-panel" style={{ padding: '1.5rem', background: '#fff' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                                        <Star size={20} fill="#FF2E63" color="#FF2E63" />
                                        <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Série</span>
                                    </div>
                                    <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: '#FF2E63' }}>
                                        7
                                    </div>
                                    <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.25rem' }}>jours</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Read Card */}
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Recent Read Hero</h3>
                            <div style={{ maxWidth: '600px' }}>
                                <div className="manga-panel" style={{ padding: 0, overflow: 'hidden', height: '220px', position: 'relative' }}>
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        background: `url(https://cdn.myanimelist.net/images/manga/2/253146l.jpg) center/cover`,
                                        filter: 'brightness(0.8)'
                                    }} />
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        background: 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)'
                                    }} />
                                    <div style={{ position: 'relative', zIndex: 10, height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff' }}>
                                        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', background: '#FF2E63', padding: '4px 8px', width: 'fit-content', fontWeight: 800, marginBottom: '0.5rem' }}>MANGA</span>
                                        <h3 style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '0.5rem', textShadow: '2px 2px 0 #000' }}>One Piece</h3>
                                        <p style={{ opacity: 0.9, fontSize: '1rem', fontWeight: 600 }}>Chapitre 1100 <span style={{ opacity: 0.6 }}>/ ?</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </section>

                {/* SECTION: TYPOGRAPHY */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Typography</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>H1 / Display</span>
                            <h1 style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1 }}>BINGEKI V2</h1>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>H2</span>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Chapter 1: The Beginning</h2>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>H3</span>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Character Stats</h3>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Body</span>
                            <p style={{ fontSize: '1rem', lineHeight: 1.6, maxWidth: '600px' }}>
                                A classic clean body text suitable for reading long descriptions of manga or anime plots. Reliable and legible.
                            </p>
                        </div>
                    </div>
                </section>

                {/* SECTION: BUTTONS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Buttons</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                        <Button variant="primary">Primary Button</Button>
                        <Button variant="secondary">Secondary Button</Button>
                        <Button variant="outline">Outline Button</Button>
                        <Button variant="ghost">Ghost Button</Button>
                        <Button variant="manga">Manga Style</Button>

                        <div style={{ width: '100%' }}></div> {/* Break */}

                        <Button size="sm" variant="primary">Small</Button>
                        <Button size="md" variant="primary">Medium</Button>
                        <Button size="lg" variant="primary">Large</Button>
                        <Button size="icon" variant="primary"><Zap size={20} /></Button>
                    </div>
                </section>

                {/* SECTION: CARDS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Cards</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>

                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Standard Card</h3>
                            <Card className="p-4">
                                <h4 style={{ fontWeight: 700, fontSize: '1.2rem' }}>Simple Card</h4>
                                <p style={{ opacity: 0.7 }}>A container for basic content.</p>
                            </Card>
                        </div>

                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Manga Panel Card</h3>
                            <Card variant="manga" className="p-4">
                                <h4 style={{ fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase' }}>Action Panel</h4>
                                <p>With thick borders and strong contrast.</p>
                            </Card>
                        </div>

                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Glass Card</h3>
                            <div style={{ background: '#333', padding: '1rem', borderRadius: '8px' }}>
                                <Card variant="glass" className="p-4 text-white">
                                    <h4 style={{ fontWeight: 700 }}>Glassmorphism</h4>
                                    <p style={{ opacity: 0.8 }}>Blurry background effect.</p>
                                </Card>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION: INPUTS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Inputs</h2>
                    <div style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Input placeholder="Standard Input..." />
                        <Input placeholder="With Icon..." icon={<Star size={16} />} />
                        <Input placeholder="Search..." icon={<Zap size={16} />} />
                    </div>
                </section>

                {/* SECTION: HUNTER LICENSE */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Hunter License</h2>
                    <div style={{ maxWidth: '400px' }}>
                        <HunterLicenseCard
                            user={{
                                uid: '123456',
                                displayName: 'Moussandou',
                                bio: 'Full-stack Dev & Hunter',
                                themeColor: '#FF4500',
                                borderColor: '#000',
                                cardBgColor: '#fff',
                                photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
                            }}
                            stats={{
                                level: 42,
                                xp: 8500,
                                xpToNextLevel: 10000,
                                streak: 7,
                                badgeCount: 12,
                                totalChaptersRead: 145,
                                totalWorksCompleted: 23
                            }}
                            isOwnProfile={false}
                            featuredBadgeData={{ icon: 'crown', rarity: 'legendary', name: 'King of the Hill' }}
                            top3FavoritesData={[
                                { id: '1', title: 'One Piece', image: 'https://cdn.myanimelist.net/images/manga/2/253146l.jpg' },
                                { id: '2', title: 'Berserk', image: 'https://cdn.myanimelist.net/images/manga/1/157897l.jpg' },
                                { id: '3', title: 'Attack on Titan', image: 'https://cdn.myanimelist.net/images/manga/2/3786l.jpg' }
                            ]}
                        />
                    </div>
                </section>

                {/* SECTION: GAMIFICATION */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Gamification Elements</h2>
                    <div style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>XP Bar</h3>
                            <XPBar current={8500} max={10000} level={42} />
                        </div>
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Level Pill (Header)</h3>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                border: '2px solid #000',
                                borderRadius: '100px',
                                padding: '4px 12px',
                                gap: '8px',
                                background: '#fff',
                                boxShadow: '2px 2px 0 #000',
                                fontWeight: 700,
                                fontSize: '0.9rem'
                            }}>
                                <span style={{ color: '#FF2E63' }}>Lvl 42</span>
                                <span style={{ opacity: 0.3 }}>|</span>
                                <span>8500 XP</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION: NAVIGATION */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Navigation Components</h2>
                    <div style={{ display: 'grid', gap: '2rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Logo Brand</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {/* Placeholder for Logo Image if missing */}
                                <div style={{ width: 50, height: 50, background: '#000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}>B</div>
                                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                                    <span style={{ fontSize: '1.5rem', fontFamily: '"Outfit", sans-serif', fontWeight: 900, letterSpacing: '-1px' }}>BINGEKI</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Nav Links</h3>
                            <div style={{ display: 'flex', gap: '1.5rem', background: '#fff', padding: '1rem', border: '1px solid #ddd' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 1, fontWeight: 700, borderBottom: '2px solid #FF2E63', paddingBottom: '2px' }}>
                                    <Home size={18} />
                                    <span>Active</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.5, fontWeight: 500 }}>
                                    <Book size={18} />
                                    <span>Inactive</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION: SOCIAL */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Social Components</h2>
                    <div style={{ display: 'grid', gap: '2rem', maxWidth: '300px' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Friend Activity Card</h3>
                            {/* Mock of FriendRecommendation Card */}
                            <div style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                                <div style={{
                                    position: 'relative',
                                    aspectRatio: '2/3',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: '2px solid #000',
                                    marginBottom: '0.5rem'
                                }}>
                                    <img
                                        src="https://cdn.myanimelist.net/images/anime/1015/138006l.jpg"
                                        alt="Frieren"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                        padding: '0.5rem',
                                        background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                                        display: 'flex', alignItems: 'center', gap: '0.25rem'
                                    }}>
                                        <div style={{ display: 'flex', marginLeft: '-4px' }}>
                                            {[1, 2, 3].map((_, i) => (
                                                <div key={i} style={{
                                                    width: 22, height: 22, borderRadius: '50%', overflow: 'hidden',
                                                    border: '2px solid #fff', marginLeft: '-4px', background: '#ccc'
                                                }}>
                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="" style={{ width: '100%', height: '100%' }} />
                                                </div>
                                            ))}
                                        </div>
                                        <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>3 amis</span>
                                    </div>
                                </div>
                                <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>Frieren: Beyond Journey's End</p>
                                <p style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>ANIME</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION: DEVELOPER IDENTITY */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Developer Identity</h2>
                    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <DeveloperLicenseCard
                            user={{
                                uid: 'USER-20-28',
                                displayName: 'Moussandou Mroivili',
                                title: 'Développeur Full-Stack',
                                bio: 'Curieux, Passionné, Autonome',
                                location: 'Marseille, France',
                                email: 'moussandou.mroivili@epitech.eu',
                                phone: '07 81 63 32 78',
                            }}
                            stats={{
                                uptime: '20 ans',
                                projects: '15+',
                                languages: '8',
                                experience: '2+',
                                motivation: 100
                            }}
                            education={[
                                { school: 'Epitech - Marseille', degree: 'Programme Grande École', year: '2023 - 2028' },
                                { school: 'Lycée Saint-Exupéry', degree: 'Baccalauréat Général', year: '2020 - 2023' }
                            ]}
                            projects={[
                                { title: 'SpriteLab', desc: 'Outil de Gestion Spritesheet', tech: 'React 18 / TS / Vite' },
                                { title: 'Bingeki', desc: 'Anime & Manga Tracker', tech: 'React / Firebase' },
                                { title: 'Bambu Buddy', desc: '3D Print Manager', tech: 'React / Tauri' }
                            ]}
                            logs={[
                                'moussandou@localhost:~$ ./lancer_portfolio.sh',
                                '[████████████] 100% - Accès autorisé ✓',
                                '// Développeur Full-Stack //'
                            ]}
                        />
                    </div>
                </section>

                {/* SECTION: PAGE MOCKUPS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Page Mockups (High Fidelity)</h2>
                    <div style={{ display: 'grid', gap: '3rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Dashboard View</h3>
                            <MockupBrowser url="bingeki.app/dashboard">
                                <MockupDashboard />
                            </MockupBrowser>
                        </div>

                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Profile View</h3>
                            <MockupBrowser url="bingeki.app/profile/moussandou">
                                <MockupProfile />
                            </MockupBrowser>
                        </div>
                    </div>
                </section>

                {/* SECTION: MOBILE MOCKUPS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Maquettes Mobile</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', justifyContent: 'center' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textAlign: 'center' }}>Dashboard Mobile</h3>
                            <MockupPhone>
                                <MockupDashboardMobile />
                            </MockupPhone>
                        </div>

                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textAlign: 'center' }}>Profil Mobile</h3>
                            <MockupPhone>
                                <MockupProfileMobile />
                            </MockupPhone>
                        </div>
                    </div>
                </section>

                {/* SECTION: DISCOVER MOCKUPS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Maquettes Découverte</h2>
                    <div style={{ display: 'grid', gap: '3rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Discover View (Desktop)</h3>
                            <MockupBrowser url="bingeki.app/discover">
                                <MockupDiscover />
                            </MockupBrowser>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textAlign: 'center' }}>Discover Mobile</h3>
                                <MockupPhone>
                                    <MockupDiscoverMobile />
                                </MockupPhone>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION: DETAILS MOCKUPS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Maquettes Détails (Anime/Manga)</h2>
                    <div style={{ display: 'grid', gap: '3rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Details View (Desktop)</h3>
                            <MockupBrowser url="bingeki.app/manga/attack-on-titan">
                                <MockupDetails />
                            </MockupBrowser>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textAlign: 'center' }}>Details Mobile</h3>
                                <MockupPhone>
                                    <MockupDetailsMobile />
                                </MockupPhone>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION: LIBRARY MOCKUPS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Maquettes Bibliothèque</h2>
                    <div style={{ display: 'grid', gap: '3rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Library View (Desktop)</h3>
                            <MockupBrowser url="bingeki.app/library">
                                <MockupLibrary />
                            </MockupBrowser>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textAlign: 'center' }}>Library Mobile</h3>
                                <MockupPhone>
                                    <MockupLibraryMobile />
                                </MockupPhone>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION: SCHEDULE MOCKUPS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Maquettes Planning</h2>
                    <div style={{ display: 'grid', gap: '3rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Schedule View (Desktop)</h3>
                            <MockupBrowser url="bingeki.app/schedule">
                                <MockupSchedule />
                            </MockupBrowser>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textAlign: 'center' }}>Schedule Mobile</h3>
                                <MockupPhone>
                                    <MockupScheduleMobile />
                                </MockupPhone>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION: SOCIAL MOCKUPS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Maquettes Social</h2>
                    <div style={{ display: 'grid', gap: '3rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Social View (Desktop)</h3>
                            <MockupBrowser url="bingeki.app/social">
                                <MockupSocial />
                            </MockupBrowser>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textAlign: 'center' }}>Social Mobile</h3>
                                <MockupPhone>
                                    <MockupSocialMobile />
                                </MockupPhone>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION: AUTH MOCKUPS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Maquettes Authentification</h2>
                    <div style={{ display: 'grid', gap: '3rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Login View (Desktop)</h3>
                            <MockupBrowser url="bingeki.app/login">
                                <MockupAuth />
                            </MockupBrowser>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textAlign: 'center' }}>Login Mobile</h3>
                                <MockupPhone>
                                    <MockupAuthMobile />
                                </MockupPhone>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION: FEATURE LIST */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Feature List (Keywords)</h2>
                    <div style={{
                        border: '3px solid #000',
                        maxWidth: '600px',
                        margin: '0 auto',
                        padding: '2rem',
                        background: '#fff',
                        position: 'relative',
                        boxShadow: '8px 8px 0 rgba(0,0,0,1)' // Hard shadow for pop
                    }}>
                        {/* Title Badge similar to Scout Card */}
                        <div style={{
                            position: 'absolute',
                            top: '-15px',
                            left: '20px',
                            background: '#000',
                            color: '#fff',
                            padding: '0.2rem 1rem',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            fontSize: '0.9rem',
                            letterSpacing: '1px'
                        }}>
                            Bingeki Core Systems
                        </div>

                        <ul style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '1.5rem 2rem',
                            listStyle: 'none',
                            padding: '1rem 0 0 0',
                            margin: 0
                        }}>
                            {[
                                "Suivi Anime & Manga",
                                "Système de Rangs & XP",
                                "Calendrier de Sorties",
                                "Profil Personnalisable",
                                "Recommandations",
                                "Réseau Social & Flux",
                                "Statistiques Détaillées",
                                "Critiques & Reviews"
                            ].map((feature, i) => (
                                <li key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.8rem',
                                    fontWeight: 700,
                                    fontSize: '1.1rem',
                                    fontFamily: 'var(--font-heading)'
                                }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        background: '#FF2E63',
                                        transform: 'rotate(45deg)', // Diamond bullet
                                        flexShrink: 0
                                    }}></div>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* SECTION: LANDING PAGE ELEMENTS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Landing Page UI Kit</h2>
                    <div style={{ display: 'grid', gap: '3rem' }}>

                        {/* HERO TITLE */}
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Hero Title (Display)</h3>
                            <div style={{ background: '#f4f4f4', padding: '2rem', border: '1px dashed #ccc', overflow: 'hidden' }}>
                                <h1 style={{
                                    fontSize: '4.5rem',
                                    fontWeight: 900,
                                    lineHeight: 0.9,
                                    textTransform: 'uppercase',
                                    letterSpacing: '-0.05em',
                                    transform: 'rotate(-2deg)',
                                    textShadow: '4px 4px 0px #FF2E63',
                                    color: '#0f0f0f',
                                    fontFamily: '"Outfit", sans-serif',
                                    margin: 0
                                }}>
                                    VOTRE HISTOIRE<br />COMMENCE
                                </h1>
                            </div>
                        </div>

                        {/* SECTION TITLE & DESCRIPTION */}
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Section Headers & Blurbe</h3>
                            <div style={{ background: '#f4f4f4', padding: '2rem', border: '1px dashed #ccc', position: 'relative' }}>
                                {/* SFX */}
                                <div style={{
                                    position: 'absolute', top: '1rem', right: '1rem',
                                    fontWeight: 900, fontStyle: 'italic', color: '#808080', opacity: 0.2, fontSize: '4rem', pointerEvents: 'none'
                                }}>
                                    SUIVI !!
                                </div>

                                <h2 style={{
                                    fontSize: '3rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    marginBottom: '1.5rem',
                                    lineHeight: 1,
                                    display: 'inline-block',
                                    padding: '0.5rem 1rem',
                                    background: '#fff',
                                    border: '3px solid #000',
                                    boxShadow: '6px 6px 0 #FF2E63',
                                    fontFamily: '"Outfit", sans-serif'
                                }}>
                                    LE Q.G.
                                </h2>

                                <div style={{
                                    fontFamily: '"Inter", sans-serif',
                                    fontSize: '1.2rem',
                                    lineHeight: 1.6,
                                    background: 'rgba(255,255,255,0.9)',
                                    padding: '1.5rem',
                                    borderLeft: '4px solid #FF2E63',
                                    maxWidth: '600px'
                                }}>
                                    <p>Organisez votre vidéothèque comme un stratège. Séparez vos lectures en cours et ne perdez plus jamais le fil.</p>
                                </div>
                            </div>
                        </div>

                        {/* CTA BUTTON */}
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>CTA Button (Polygon)</h3>
                            <div>
                                <button style={{
                                    background: '#FF2E63',
                                    color: '#fff',
                                    padding: '1rem 3rem',
                                    fontSize: '1.2rem',
                                    fontWeight: 900,
                                    border: 'none',
                                    clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0% 100%)',
                                    textTransform: 'uppercase',
                                    fontFamily: '"Outfit", sans-serif'
                                }}>
                                    COMMENCER L'AVENTURE
                                </button>
                            </div>
                        </div>

                    </div>
                </section>

                {/* SECTION: ICON SET */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Icon Set</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1.5rem' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Star size={32} />
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Star</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Heart size={32} />
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Heart</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Zap size={32} />
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Zap</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={32} />
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Shield</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Home size={32} />
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Home</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Book size={32} />
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Book</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Search size={32} />
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Search</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <MessageSquare size={32} />
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Message</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={32} />
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Calendar</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={32} />
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>User</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Flame size={32} />
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Flame</span>
                        </div>

                    </div>
                </section>

                {/* SECTION: BUDGET BREAKDOWN */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Budget Breakdown</h2>

                    <div style={{ display: 'grid', gap: '2rem' }}>

                        {/* CATEGORY GRID */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {[
                                {
                                    category: "Technique",
                                    total: "950 €",
                                    items: [
                                        { label: "Firebase Blaze 1 an", price: "600 €" },
                                        { label: "CDN et Optimisation", price: "200 €" },
                                        { label: "APIs tierces", price: "150 €" }
                                    ]
                                },
                                {
                                    category: "Design et UX",
                                    total: "1000 €",
                                    items: [
                                        { label: "Designer UX UI pro", price: "500 €" },
                                        { label: "Illustrations custom", price: "300 €" },
                                        { label: "Logo et Identité", price: "200 €" }
                                    ]
                                },
                                {
                                    category: "Marketing",
                                    total: "850 €",
                                    items: [
                                        { label: "Publicité réseaux", price: "400 €" },
                                        { label: "Partenariats influenceurs", price: "300 €" },
                                        { label: "Création contenu", price: "150 €" }
                                    ]
                                },
                                {
                                    category: "Événementiel",
                                    total: "200 €",
                                    items: [
                                        { label: "Meetup de lancement", price: "150 €" },
                                        { label: "Goodies et merch", price: "50 €" }
                                    ]
                                }
                            ].map((cat, i) => (
                                <div key={i} style={{
                                    border: '3px solid #000',
                                    background: '#fff',
                                    position: 'relative',
                                    paddingBottom: '3rem' // Space for total
                                }}>
                                    {/* Header */}
                                    <div style={{
                                        background: '#000',
                                        color: '#fff',
                                        padding: '0.5rem 1rem',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        fontFamily: 'var(--font-heading)',
                                        fontSize: '1.2rem',
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span>{cat.category}</span>
                                    </div>

                                    {/* Items */}
                                    <div style={{ padding: '1.5rem' }}>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            {cat.items.map((item, j) => (
                                                <li key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', fontWeight: 500 }}>
                                                    <span style={{ fontFamily: 'var(--font-heading)' }}>{item.label}</span>
                                                    <span style={{ fontWeight: 700 }}>{item.price}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Sub-Total Footer */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        borderTop: '2px solid #000',
                                        padding: '0.5rem 1rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        background: '#f4f4f4',
                                        fontWeight: 900
                                    }}>
                                        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6 }}>Sous-total</span>
                                        <span style={{ color: '#FF2E63' }}>{cat.total}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* TOTAL SUMMARY CARD */}
                        <div style={{
                            border: '4px solid #000',
                            padding: '2rem',
                            background: '#FF2E63',
                            color: '#fff',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '8px 8px 0 #000'
                        }}>
                            <h3 style={{ fontSize: '1.5rem', textTransform: 'uppercase', fontWeight: 900, margin: 0 }}>Budget Global Estimé</h3>
                            <div style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1, fontFamily: 'var(--font-heading)' }}>3 000 €</div>
                            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Investissement Initial pour le MVP</div>
                        </div>

                    </div>
                </section>

                {/* SECTION: PROJECT STATUS */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Project Status & Achievements</h2>

                    {/* Container */}
                    <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                        {/* Title Block */}
                        <div style={{
                            background: '#000', color: '#fff', padding: '1rem 2rem',
                            textAlign: 'center', marginBottom: '2rem',
                            transform: 'skew(-2deg)'
                        }}>
                            <h3 style={{ fontSize: '2rem', textTransform: 'uppercase', fontWeight: 900, margin: 0, fontFamily: 'var(--font-heading)' }}>Déjà Réalisé</h3>
                        </div>

                        {/* Top Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                            {[
                                { val: "v2.8", label: "Version actuelle déployée" },
                                { val: "13", label: "Mises à jour majeures" },
                                { val: "100%", label: "Fonctionnel et Responsive" },
                                { val: "PWA", label: "Installable sur mobile" }
                            ].map((stat, i) => (
                                <div key={i} style={{
                                    border: '3px solid #000',
                                    padding: '1.5rem 1rem',
                                    textAlign: 'center',
                                    background: '#fff',
                                    boxShadow: '4px 4px 0 rgba(0,0,0,1)'
                                }}>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, marginBottom: '0.5rem', color: i === 0 || i === 2 ? '#FF2E63' : '#000' }}>{stat.val}</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Live Features Section */}
                        <div style={{ border: '3px solid #000', background: '#f4f4f4', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '12px', height: '12px', borderRadius: '50%',
                                    background: '#00ff00', boxShadow: '0 0 10px #00ff00'
                                }}></div>
                                <h4 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.2rem', margin: 0 }}>Fonctionnalités Live</h4>
                            </div>

                            <div style={{
                                display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'center'
                            }}>
                                {[
                                    "Système XP", "Badges", "Profils Hunter", "API Jikan", "Amis", "Défis",
                                    "Watch Parties", "Agenda", "Casting", "Reviews", "13 mises à jour continues"
                                ].map((feat, i) => (
                                    <span key={i} style={{
                                        background: '#fff', border: '1px solid #000',
                                        padding: '0.4rem 0.8rem', fontWeight: 600, fontSize: '0.9rem',
                                        boxShadow: '2px 2px 0 #000'
                                    }}>
                                        {feat}
                                    </span>
                                ))}
                            </div>
                        </div>

                    </div>
                </section>

                {/* SECTION: CONCLUSION / THANK YOU */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Conclusion & Contact</h2>

                    <div style={{
                        border: '4px solid #000',
                        maxWidth: '900px',
                        margin: '0 auto',
                        background: '#fff',
                        position: 'relative',
                        display: 'grid',
                        gridTemplateColumns: '1fr 300px', // Content | QR Sidebar
                        minHeight: '400px'
                    }}>

                        {/* Left: Content */}
                        <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏯</div>

                            <h1 style={{
                                fontSize: '4rem', fontWeight: 900, lineHeight: 0.9,
                                margin: '0 0 1rem 0', fontFamily: 'var(--font-heading)',
                                textTransform: 'uppercase', color: '#000'
                            }}>
                                BINGEKI
                            </h1>

                            <h2 style={{
                                fontSize: '1.5rem', fontWeight: 700, margin: '0 0 2rem 0',
                                color: '#FF2E63', fontFamily: 'var(--font-heading)'
                            }}>
                                De passion personnelle à plateforme communautaire
                            </h2>

                            <p style={{
                                fontSize: '1.2rem', fontWeight: 500, lineHeight: 1.5,
                                borderLeft: '4px solid #000', paddingLeft: '1.5rem',
                                marginBottom: '2rem'
                            }}>
                                <strong>3 000 euros</strong> pour transformer un projet fonctionnel en une référence de la scène anime manga francophone.
                            </p>

                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
                                <span>🌐 bingeki.web.app</span>
                                <span>📧 moussandou.m@gmail.com</span>
                                <span>📱 07 81 63 32 78</span>
                            </div>
                        </div>

                        {/* Right: QR Code & Message */}
                        <div style={{
                            background: '#000',
                            color: '#fff',
                            padding: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '200px', height: '200px',
                                background: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '2rem',
                                border: '4px solid #FF2E63'
                            }}>
                                <span style={{ color: '#000', fontWeight: 900, opacity: 0.3 }}>QR CODE CLI</span>
                            </div>

                            <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>
                                Merci pour votre attention ! 🙏
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
