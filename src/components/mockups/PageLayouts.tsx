import { Card } from '@/components/ui/Card';
import { Home, Book, Search, User, Zap, Star, Calendar } from 'lucide-react';
import { HunterLicenseCard } from '@/components/profile/HunterLicenseCard';

// Helper for consistency
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '1rem', textTransform: 'uppercase', fontFamily: '"Outfit", sans-serif' }}>
        {children}
    </h2>
);

export function MockupDashboard() {
    return (
        <div style={{ display: 'flex', minHeight: '600px', background: '#f5f5f5', color: '#000' }}>
            {/* Sidebar */}
            <div style={{ width: '80px', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '2rem' }}>
                <div style={{ width: 40, height: 40, background: '#FF2E63', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff' }}>B</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#666' }}>
                    <Home color="#fff" />
                    <Book />
                    <Search />
                    <Calendar />
                    <User />
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, padding: '2rem', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, fontFamily: '"Outfit", sans-serif' }}>CONTINUE READING</h1>
                        <p style={{ opacity: 0.6 }}>Welcome back, Hunter.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', border: '2px solid #000',
                            borderRadius: '100px', padding: '4px 12px', gap: '8px', background: '#fff',
                            boxShadow: '2px 2px 0 #000', fontWeight: 700, fontSize: '0.8rem'
                        }}>
                            <span style={{ color: '#FF2E63' }}>Lvl 42</span>
                            <span style={{ opacity: 0.3 }}>|</span>
                            <span>8500 XP</span>
                        </div>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ccc', overflow: 'hidden', border: '2px solid #000' }}>
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" style={{ width: '100%', height: '100%' }} />
                        </div>
                    </div>
                </div>

                {/* Hero / Quick Continue */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                    {/* Hero Card */}
                    <div className="manga-panel" style={{
                        height: '250px', position: 'relative', overflow: 'hidden', color: '#fff',
                        display: 'flex', flexDirection: 'column', justifyContent: 'end', padding: '2rem'
                    }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'url(https://cdn.myanimelist.net/images/manga/2/253146l.jpg) center/cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }} />
                        <div style={{ position: 'relative', zIndex: 2 }}>
                            <span style={{ background: '#FF2E63', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>New Chapter</span>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, margin: '0.5rem 0' }}>One Piece</h2>
                            <p style={{ opacity: 0.9 }}>Chapter 1105: The Height of Folly</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '1rem' }}>
                        <div className="manga-panel" style={{ background: '#fff', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                                <Zap size={16} /> <span style={{ fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase' }}>Daily Goal</span>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 900 }}>1<span style={{ fontSize: '1rem', opacity: 0.4 }}>/3</span></div>
                            <div style={{ width: '100%', height: '4px', background: '#eee', marginTop: '0.5rem' }}>
                                <div style={{ width: '33%', height: '100%', background: '#FF2E63' }} />
                            </div>
                        </div>
                        <div className="manga-panel" style={{ background: '#fff', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                                <Star size={16} color="#FF2E63" fill="#FF2E63" /> <span style={{ fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase' }}>Weekly Streak</span>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FF2E63' }}>7 <span style={{ fontSize: '0.8rem', color: '#000', opacity: 0.5 }}>days</span></div>
                        </div>
                    </div>
                </div>

                {/* Grid List */}
                <SectionTitle>Trending This Week</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} variant="manga" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ height: '180px', background: '#ddd', position: 'relative' }}>
                                {/* Image Placeholder */}
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1, fontSize: '2rem', fontWeight: 900 }}>IMG</div>
                            </div>
                            <div style={{ padding: '1rem' }}>
                                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Manga Title {i}</h4>
                                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Vol. 12 • Action</span>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function MockupProfile() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '600px', background: '#f5f5f5', color: '#000' }}>
            {/* Banner */}
            <div style={{ height: '200px', background: '#111', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.2,
                    backgroundImage: 'radial-gradient(#fff 2px, transparent 2.5px)', backgroundSize: '20px 20px'
                }} />
            </div>

            <div style={{ maxWidth: '800px', margin: '-60px auto 0', width: '100%', padding: '0 2rem' }}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', marginBottom: '2rem' }}>
                    <div style={{ width: 120, height: 120, borderRadius: '50%', border: '4px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', background: '#fff', overflow: 'hidden' }}>
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="" style={{ width: '100%', height: '100%' }} />
                    </div>
                    <div style={{ paddingBottom: '1rem' }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>Moussandou</h1>
                        <p style={{ opacity: 0.6, fontSize: '1.1rem' }}>Hunter Rank: <span style={{ color: '#FF2E63', fontWeight: 700 }}>S-Class</span></p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <Card variant="manga" style={{ padding: '2rem' }}>
                            <SectionTitle>Hunter License</SectionTitle>
                            <div style={{ transform: 'scale(0.9)', transformOrigin: 'top left' }}>
                                <HunterLicenseCard
                                    user={{
                                        uid: '123', displayName: 'Moussandou', bio: 'Full-stack Hunter',
                                        themeColor: '#FF2E63', borderColor: '#000', cardBgColor: '#fff',
                                        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
                                    }}
                                    stats={{ level: 42, xp: 8500, xpToNextLevel: 10000, streak: 7, badgeCount: 12, totalChaptersRead: 145, totalWorksCompleted: 23 }}
                                    isOwnProfile={false}
                                />
                            </div>
                        </Card>

                        <div>
                            <SectionTitle>Recent Activity</SectionTitle>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[1, 2].map(i => (
                                    <div key={i} style={{ background: '#fff', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', display: 'flex', gap: '1rem' }}>
                                        <div style={{ width: 40, height: 40, background: '#eee', borderRadius: '4px' }} />
                                        <div>
                                            <p style={{ fontSize: '0.9rem' }}><span style={{ fontWeight: 700 }}>Read Chapter 102</span> of <strong>Berserk</strong></p>
                                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>2 hours ago</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <Card style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Statistics</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ opacity: 0.6 }}>Manga Read</span>
                                    <span style={{ fontWeight: 700 }}>142</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ opacity: 0.6 }}>Anime Watched</span>
                                    <span style={{ fontWeight: 700 }}>56</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ opacity: 0.6 }}>Reviews</span>
                                    <span style={{ fontWeight: 700 }}>12</span>
                                </div>
                            </div>
                        </Card>

                        <Card style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Badges</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <div key={i} style={{ aspectRatio: '1/1', background: '#eee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>🏆</div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
