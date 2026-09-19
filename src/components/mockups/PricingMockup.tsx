import { useState } from 'react';
import {
    Check, X, Crown, Zap, Star, Sparkles, Shield,
    Eye, Library, Users, Ban, Infinity as InfinityIcon, Download,
    Palette, TrendingUp, Award, BarChart3, CheckCheck,
    Radio, Lock, Upload, Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

type PlanKey = 'free' | 'premium' | 'premium-plus';

interface Perk {
    icon: React.ReactNode;
    text: string;
}

interface Plan {
    key: PlanKey;
    name: string;
    tagline: string;
    priceMonthly: string;
    priceYearly: string;
    accent: string;
    icon: React.ReactNode;
    highlight?: boolean;
    ctaLabel: string;
    ctaVariant: 'outline' | 'primary' | 'manga';
    perks: Perk[];
}

const PLANS: Plan[] = [
    {
        key: 'free',
        name: 'GRATUIT',
        tagline: "Commence l'aventure",
        priceMonthly: '0€',
        priceYearly: '0€',
        accent: '#1a1a1a',
        icon: <Shield size={28} />,
        ctaLabel: 'COMMENCER',
        ctaVariant: 'outline',
        perks: [
            { icon: <Eye size={20} />, text: "Suivi anime & manga" },
            { icon: <Library size={20} />, text: "Bibliothèque jusqu'à 100 titres" },
            { icon: <Zap size={20} />, text: "Progression XP standard" },
            { icon: <Users size={20} />, text: "Accès communauté" },
        ],
    },
    {
        key: 'premium',
        name: 'PREMIUM',
        tagline: "Le confort de l'otaku",
        priceMonthly: '1,99€',
        priceYearly: '19,99€',
        accent: '#FF2E63',
        icon: <Star size={28} />,
        highlight: true,
        ctaLabel: "S'ABONNER",
        ctaVariant: 'primary',
        perks: [
            { icon: <Ban size={20} />, text: "Sans publicité" },
            { icon: <InfinityIcon size={20} />, text: "Bibliothèque illimitée" },
            { icon: <Download size={20} />, text: "Import MyAnimeList / AniList" },
            { icon: <Palette size={20} />, text: "Thèmes & bannières" },
            { icon: <TrendingUp size={20} />, text: "+10% XP boost" },
            { icon: <Award size={20} />, text: "Badges mensuels exclusifs" },
            { icon: <BarChart3 size={20} />, text: "Statistiques avancées" },
        ],
    },
    {
        key: 'premium-plus',
        name: 'PREMIUM+',
        tagline: 'Le mode Légendaire',
        priceMonthly: '4,99€',
        priceYearly: '49,99€',
        accent: '#08D9D6',
        icon: <Crown size={28} />,
        ctaLabel: 'PASSER LEGENDARY',
        ctaVariant: 'manga',
        perks: [
            { icon: <CheckCheck size={20} />, text: "Tout Premium inclus" },
            { icon: <Crown size={20} />, text: "Hunter License holofoil" },
            { icon: <Sparkles size={20} />, text: "Avatars animés exclusifs" },
            { icon: <Radio size={20} />, text: "Watch parties illimitées" },
            { icon: <TrendingUp size={20} />, text: "+25% XP + bonus hebdo" },
            { icon: <Lock size={20} />, text: "Collections privées" },
            { icon: <Upload size={20} />, text: "Export CSV / JSON" },
            { icon: <Rocket size={20} />, text: "Priorité support & accès anticipé" },
        ],
    },
];

interface FeatureRow {
    label: string;
    free: string | boolean;
    premium: string | boolean;
    premiumPlus: string | boolean;
}

interface FeatureGroup {
    title: string;
    rows: FeatureRow[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
    {
        title: 'Suivi & Bibliothèque',
        rows: [
            { label: 'Suivi anime & manga', free: true, premium: true, premiumPlus: true },
            { label: 'Titres suivis', free: '100', premium: 'Illimité', premiumPlus: 'Illimité' },
            { label: 'Collections privées', free: false, premium: false, premiumPlus: true },
            { label: 'Import MAL / AniList', free: false, premium: true, premiumPlus: true },
            { label: 'Export CSV / JSON', free: false, premium: false, premiumPlus: true },
        ],
    },
    {
        title: 'Expérience & Personnalisation',
        rows: [
            { label: 'Sans publicité', free: false, premium: true, premiumPlus: true },
            { label: 'Personnalisation profil', free: 'Basique', premium: 'Thèmes & bannières', premiumPlus: 'Thèmes exclusifs + avatars animés' },
            { label: 'Hunter License holofoil', free: false, premium: false, premiumPlus: true },
        ],
    },
    {
        title: 'Gamification & Progression',
        rows: [
            { label: 'Progression XP', free: 'Standard', premium: '+10% XP', premiumPlus: '+25% XP + bonus hebdo' },
            { label: 'Classements & défis', free: 'Limité', premium: 'Standard', premiumPlus: 'Avancé + exclusif' },
            { label: 'Badges & rangs', free: false, premium: 'Badges mensuels', premiumPlus: 'Badges rares + icônes Premium' },
        ],
    },
    {
        title: 'Social & Communauté',
        rows: [
            { label: 'Watch parties', free: false, premium: false, premiumPlus: true },
            { label: 'Statistiques avancées', free: false, premium: 'Basique', premiumPlus: 'Détail complet' },
            { label: 'Tierlists', free: '3 max', premium: 'Illimité', premiumPlus: 'Illimité + collaboration' },
            { label: 'Priorité support & nouveautés', free: false, premium: false, premiumPlus: true },
        ],
    },
];

const FAQ = [
    {
        q: "Puis-je annuler à tout moment ?",
        a: "Oui, tu peux résilier ton abonnement à n'importe quel moment depuis ton profil. Tu conserves tes avantages jusqu'à la fin de la période payée.",
    },
    {
        q: "L'abonnement est-il obligatoire pour utiliser Bingeki ?",
        a: "Non. Le plan Gratuit reste accessible à tous, avec les fonctionnalités essentielles de suivi et de découverte.",
    },
    {
        q: "Que se passe-t-il si je downgrade vers Gratuit ?",
        a: "Tes données restent intactes. Certaines features Premium (thèmes exclusifs, collections privées) sont désactivées mais retrouvées si tu réabonnes.",
    },
    {
        q: "Existe-t-il une offre étudiante ?",
        a: "Nous étudions une réduction dédiée pour les étudiants. Reste à l'écoute des annonces sur le Discord officiel.",
    },
];

const renderCell = (v: string | boolean, accent: string) => {
    if (typeof v === 'boolean') {
        return v ? (
            <Check size={22} strokeWidth={3} style={{ color: accent }} />
        ) : (
            <X size={22} strokeWidth={3} style={{ color: '#ccc' }} />
        );
    }
    return (
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a' }}>{v}</span>
    );
};

export default function PricingMockup() {
    const [yearly, setYearly] = useState(false);

    return (
        <div style={{ padding: '40px 20px', background: '#f5f5f5', color: '#000', position: 'relative' }}>
            {/* Halftone bg overlay */}
            <div
                aria-hidden
                style={{
                    position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none',
                    backgroundImage: 'radial-gradient(#000 2px, transparent 2.5px)',
                    backgroundSize: '24px 24px', zIndex: 0,
                }}
            />

            <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                {/* HERO */}
                <section style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.4rem 1rem', border: '2px solid #000', background: '#fff',
                        fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: '0.85rem',
                        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem',
                        boxShadow: '4px 4px 0 #000',
                    }}>
                        <Sparkles size={16} /> Nouveau · Offre Bingeki
                    </div>
                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900,
                        textTransform: 'uppercase', letterSpacing: '-2px',
                        fontFamily: '"Outfit", sans-serif', lineHeight: 0.95, marginBottom: '1rem',
                    }}>
                        Choisis ton{' '}
                        <span style={{
                            color: '#FF2E63',
                            textShadow: '3px 3px 0 #000',
                            display: 'inline-block', transform: 'rotate(-2deg)',
                        }}>
                            abonnement
                        </span>
                    </h1>
                    <p style={{
                        fontFamily: '"Inter", sans-serif', fontSize: '1.1rem', maxWidth: '640px',
                        margin: '0 auto 2rem', lineHeight: 1.5, color: '#333',
                    }}>
                        Toute la puissance du suivi anime & manga gamifié.
                        Passe au niveau supérieur quand tu es prêt.
                    </p>

                    {/* Billing toggle */}
                    <div style={{
                        display: 'inline-flex', border: '3px solid #000', background: '#fff',
                        padding: '4px', boxShadow: '4px 4px 0 #000', gap: '4px',
                    }}>
                        {(['monthly', 'yearly'] as const).map((mode) => {
                            const active = (mode === 'yearly') === yearly;
                            return (
                                <button
                                    key={mode}
                                    onClick={() => setYearly(mode === 'yearly')}
                                    style={{
                                        padding: '0.5rem 1.25rem', border: 'none', cursor: 'pointer',
                                        background: active ? '#000' : 'transparent',
                                        color: active ? '#fff' : '#000',
                                        fontFamily: '"Outfit", sans-serif', fontWeight: 800,
                                        fontSize: '0.85rem', textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    {mode === 'monthly' ? 'Mensuel' : 'Annuel'}
                                    {mode === 'yearly' && (
                                        <span style={{
                                            marginLeft: '0.5rem', padding: '0.15rem 0.4rem',
                                            background: '#FF2E63', color: '#fff', fontSize: '0.65rem',
                                        }}>
                                            −16%
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* PLANS GRID */}
                <section style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '2rem', marginBottom: '5rem',
                }}>
                    {PLANS.map((plan) => (
                        <div
                            key={plan.key}
                            className="manga-panel"
                            style={{
                                position: 'relative', background: '#fff', padding: '2rem 1.5rem',
                                display: 'flex', flexDirection: 'column', gap: '1.25rem',
                                transform: plan.highlight ? 'translateY(-12px)' : 'none',
                                borderColor: plan.highlight ? plan.accent : undefined,
                            }}
                        >
                            {plan.highlight && (
                                <div style={{
                                    position: 'absolute', top: '-16px', left: '50%',
                                    transform: 'translateX(-50%)', background: plan.accent,
                                    color: '#fff', padding: '0.35rem 1rem', border: '2px solid #000',
                                    fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                    fontSize: '0.75rem', letterSpacing: '0.1em',
                                    boxShadow: '3px 3px 0 #000', whiteSpace: 'nowrap',
                                }}>
                                    LE PLUS POPULAIRE
                                </div>
                            )}

                            {/* Icon + name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '48px', height: '48px', background: plan.accent,
                                    color: plan.accent === '#08D9D6' ? '#000' : '#fff',
                                    border: '2px solid #000', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {plan.icon}
                                </div>
                                <div>
                                    <h2 style={{
                                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                        fontSize: '1.5rem', letterSpacing: '-1px', lineHeight: 1,
                                    }}>
                                        {plan.name}
                                    </h2>
                                    <p style={{
                                        fontSize: '0.8rem', color: '#666', marginTop: '2px',
                                        fontFamily: '"Inter", sans-serif',
                                    }}>
                                        {plan.tagline}
                                    </p>
                                </div>
                            </div>

                            {/* Price */}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                <span style={{
                                    fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                    fontSize: '3rem', letterSpacing: '-2px', lineHeight: 1,
                                }}>
                                    {yearly ? plan.priceYearly : plan.priceMonthly}
                                </span>
                                <span style={{ color: '#666', fontSize: '0.9rem' }}>
                                    {plan.priceMonthly === '0€' ? 'pour toujours' : yearly ? '/ an' : '/ mois'}
                                </span>
                            </div>

                            {/* CTA */}
                            <Button variant={plan.ctaVariant} size="lg" style={{ width: '100%' }}>
                                {plan.ctaLabel}
                            </Button>

                            {/* Perks */}
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                                {plan.perks.map((perk, i) => (
                                    <li key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        fontSize: '0.9rem', lineHeight: 1.3, fontWeight: 600,
                                    }}>
                                        <span style={{
                                            width: '32px', height: '32px', flexShrink: 0,
                                            background: plan.accent,
                                            color: plan.accent === '#08D9D6' ? '#000' : '#fff',
                                            border: '2px solid #000',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {perk.icon}
                                        </span>
                                        <span>{perk.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </section>

                {/* COMPARISON TABLE */}
                <section style={{ marginBottom: '5rem' }}>
                    <h2 style={{
                        textAlign: 'center', fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                        fontSize: '2rem', textTransform: 'uppercase', letterSpacing: '-1px',
                        marginBottom: '0.5rem', textShadow: '2px 2px 0 #FF2E63',
                        transform: 'rotate(-1deg)',
                    }}>
                        Comparatif complet
                    </h2>
                    <p style={{
                        textAlign: 'center', color: '#666', marginBottom: '2rem',
                        fontFamily: '"Inter", sans-serif',
                    }}>
                        Toutes les différences détaillées, plan par plan.
                    </p>

                    <div style={{
                        background: '#fff', border: '3px solid #000', boxShadow: '8px 8px 0 #000',
                        overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                            background: '#000', color: '#fff', padding: '1rem 1.5rem',
                            alignItems: 'center', fontFamily: '"Outfit", sans-serif',
                            fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem',
                            letterSpacing: '0.05em',
                        }}>
                            <div>Fonctionnalité</div>
                            <div style={{ textAlign: 'center', color: '#aaa' }}>Gratuit</div>
                            <div style={{ textAlign: 'center', color: '#FF2E63' }}>Premium</div>
                            <div style={{ textAlign: 'center', color: '#08D9D6' }}>Premium+</div>
                        </div>

                        {FEATURE_GROUPS.map((group) => (
                            <div key={group.title}>
                                <div style={{
                                    padding: '0.75rem 1.5rem', background: '#f5f5f5',
                                    borderBottom: '2px solid #000', fontFamily: '"Outfit", sans-serif',
                                    fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase',
                                    letterSpacing: '0.05em', color: '#666',
                                }}>
                                    {group.title}
                                </div>
                                {group.rows.map((row, i) => (
                                    <div key={i} style={{
                                        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                                        padding: '0.9rem 1.5rem', alignItems: 'center',
                                        borderBottom: '1px solid #eee',
                                    }}>
                                        <div style={{
                                            fontFamily: '"Inter", sans-serif', fontSize: '0.9rem',
                                            fontWeight: 600, color: '#1a1a1a',
                                        }}>
                                            {row.label}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            {renderCell(row.free, '#666')}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            {renderCell(row.premium, '#FF2E63')}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            {renderCell(row.premiumPlus, '#08D9D6')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>

                {/* GUARANTEE STRIP */}
                <section style={{
                    background: '#000', color: '#fff', padding: '2rem',
                    border: '3px solid #000', marginBottom: '5rem',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem', textAlign: 'center',
                }}>
                    {[
                        { icon: <Zap size={28} />, title: 'Annulation à tout moment', text: 'Sans engagement, sans frais cachés.' },
                        { icon: <Shield size={28} />, title: 'Paiement sécurisé', text: 'Stripe, Apple Pay, Google Pay.' },
                        { icon: <Sparkles size={28} />, title: '7 jours d\'essai', text: 'Teste Premium sans risque.' },
                    ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ color: '#FF2E63' }}>{item.icon}</div>
                            <div style={{
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '1rem', textTransform: 'uppercase',
                            }}>
                                {item.title}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{item.text}</div>
                        </div>
                    ))}
                </section>

                {/* FAQ */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{
                        textAlign: 'center', fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                        fontSize: '2rem', textTransform: 'uppercase', letterSpacing: '-1px',
                        marginBottom: '2rem',
                    }}>
                        Questions fréquentes
                    </h2>

                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '1.5rem',
                    }}>
                        {FAQ.map((item, i) => (
                            <div
                                key={i}
                                className="manga-panel"
                                style={{ background: '#fff', padding: '1.5rem' }}
                            >
                                <h3 style={{
                                    fontFamily: '"Outfit", sans-serif', fontWeight: 800,
                                    fontSize: '1rem', textTransform: 'uppercase',
                                    marginBottom: '0.75rem', color: '#000',
                                }}>
                                    {item.q}
                                </h3>
                                <p style={{
                                    fontSize: '0.9rem', color: '#444', lineHeight: 1.5,
                                    fontFamily: '"Inter", sans-serif',
                                }}>
                                    {item.a}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
