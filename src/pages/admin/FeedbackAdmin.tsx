/**
 * Feedback Admin page
 */
import { useState, useEffect } from 'react';
import {
    Star, Trash2,
    MessageSquare, Send, ChevronDown, ChevronUp,
    Image as ImageIcon, ExternalLink, Copy, Check, Clipboard,
    CheckSquare, Square, Tag
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import {
    getAllFeedback, deleteFeedback, addAdminResponse,
    updateFeedbackDetails, type FeedbackData
} from '@/firebase/firestore';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { logger } from '@/utils/logger';

export default function AdminFeedback() {
    const { t } = useTranslation();
    const { userProfile } = useAuthStore();
    const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [responseText, setResponseText] = useState('');
    const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('open');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copiedImageIdx, setCopiedImageIdx] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filterTag, setFilterTag] = useState<string | null>(null);

    const AVAILABLE_TAGS = ['UI', 'Performance', 'Mobile', 'API', 'Bug', 'Feature'];

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredFeedbacks.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredFeedbacks.map(f => f.id)));
        }
    };

    const handleBulkResolve = async () => {
        if (!window.confirm(`Résoudre ${selectedIds.size} feedbacks ?`)) return;
        const promises = Array.from(selectedIds).map(id =>
            updateFeedbackDetails(id, { status: 'resolved' })
        );
        await Promise.all(promises);
        setFeedbacks(prev => prev.map(f =>
            selectedIds.has(f.id) ? { ...f, status: 'resolved' as const, lastUpdated: Date.now() } : f
        ));
        setSelectedIds(new Set());
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Supprimer ${selectedIds.size} feedbacks ? Cette action est irréversible.`)) return;
        const promises = Array.from(selectedIds).map(id => deleteFeedback(id));
        await Promise.all(promises);
        setFeedbacks(prev => prev.filter(f => !selectedIds.has(f.id)));
        setSelectedIds(new Set());
    };

    const handleBulkCopyForAI = async () => {
        const selected = feedbacks.filter(f => selectedIds.has(f.id));
        const combined = selected.map((item, i) =>
            `---\n### Feedback ${i + 1} / ${selected.length}\n${generateAIPrompt(item)}`
        ).join('\n\n');
        try {
            await navigator.clipboard.writeText(combined);
            alert(`${selected.length} feedbacks copiés pour l'IA !`);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = combined;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    };

    const handleToggleTag = async (feedbackId: string, tag: string) => {
        const item = feedbacks.find(f => f.id === feedbackId);
        if (!item) return;
        const current = item.tags || [];
        const next = current.includes(tag)
            ? current.filter(t => t !== tag)
            : [...current, tag];
        await updateFeedbackDetails(feedbackId, { tags: next });
        setFeedbacks(prev => prev.map(f =>
            f.id === feedbackId ? { ...f, tags: next } : f
        ));
    };

    const generateAIPrompt = (item: FeedbackData) => {
        const imageSection = item.attachments?.length > 0
            ? `\n\n## Screenshots / Images jointes\n${item.attachments.map((url, i) => `- Image ${i + 1}: ${url}`).join('\n')}\n\n> Note: Ouvre les URLs ci-dessus pour voir les captures d'écran du problème.`
            : '';

        return `## Contexte\nTu es un développeur travaillant sur **Bingeki**, une plateforme web de suivi d'anime/manga (React + TypeScript + Firebase).\nUn utilisateur a soumis le feedback suivant. Analyse-le et propose une solution technique.\n\n## Feedback Utilisateur\n- **Catégorie**: ${item.category?.toUpperCase() || 'GENERAL'}\n- **Priorité**: ${item.priority?.toUpperCase() || 'MEDIUM'}\n- **Note**: ${item.rating}/10\n- **Date**: ${new Date(item.timestamp).toLocaleString()}\n- **User Agent**: ${item.userAgent || 'N/A'}\n\n### Message\n\`\`\`\n${item.message}\n\`\`\`${imageSection}\n\n## Instructions\n1. Identifie la cause probable du problème / de la demande\n2. Propose les fichiers à modifier et les changements nécessaires\n3. Si c'est un bug, explique comment le reproduire et le corriger\n4. Si c'est une feature request, propose une implémentation`;
    };

    const handleCopyForAI = async (item: FeedbackData) => {
        try {
            const prompt = generateAIPrompt(item);
            await navigator.clipboard.writeText(prompt);
            setCopiedId(item.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // Fallback pour les navigateurs sans clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = generateAIPrompt(item);
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopiedId(item.id);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    const handleCopyImage = async (imageUrl: string, key: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            setCopiedImageIdx(key);
            setTimeout(() => setCopiedImageIdx(null), 2000);
        } catch {
            // Si la copie d'image échoue, copier l'URL
            await navigator.clipboard.writeText(imageUrl);
            setCopiedImageIdx(key);
            setTimeout(() => setCopiedImageIdx(null), 2000);
        }
    };

    useEffect(() => {
        loadFeedback();
    }, []);

    const loadFeedback = async () => {
        setLoading(true);
        try {
            const data = await getAllFeedback();
            setFeedbacks(data);
        } catch {
            logger.error("Failed to load feedback");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm(t('admin.feedback.confirm_delete'))) {
            try {
                await deleteFeedback(id);
                setFeedbacks(prev => prev.filter(f => f.id !== id));
            } catch {
                alert(t('admin.feedback.delete_error'));
            }
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: FeedbackData['status']) => {
        try {
            await updateFeedbackDetails(id, { status: newStatus });
            setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus, lastUpdated: Date.now() } : f));
        } catch {
            alert(t('admin.feedback.status_error'));
        }
    };

    const handlePriorityUpdate = async (id: string, newPriority: FeedbackData['priority']) => {
        try {
            await updateFeedbackDetails(id, { priority: newPriority });
            setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, priority: newPriority, lastUpdated: Date.now() } : f));
        } catch {
            alert(t('admin.feedback.priority_error'));
        }
    };

    const handleSendResponse = async (id: string) => {
        if (!responseText.trim() || !userProfile) return;

        setIsSubmittingResponse(true);
        try {
            await addAdminResponse(id, {
                adminId: userProfile.uid,
                adminName: userProfile.displayName || 'Admin',
                message: responseText
            });

            // Update local state
            setFeedbacks(prev => prev.map(f => {
                if (f.id === id) {
                    return {
                        ...f,
                        status: 'in_progress',
                        lastUpdated: Date.now(),
                        adminResponses: [
                            ...f.adminResponses,
                            {
                                adminId: userProfile.uid,
                                adminName: userProfile.displayName || 'Admin',
                                message: responseText,
                                timestamp: Date.now()
                            }
                        ]
                    };
                }
                return f;
            }));
            setResponseText('');
            alert('Réponse envoyée !');
        } catch (e) {
            logger.error("Error sending response:", e);
            alert("Erreur lors de l'envoi de la réponse");
        } finally {
            setIsSubmittingResponse(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return '#ef4444';
            case 'high': return '#f97316';
            case 'medium': return '#3b82f6';
            case 'low': return '#10b981';
            default: return '#6b7280';
        }
    };

    const filteredFeedbacks = feedbacks.filter(f => {
        if (filterStatus === 'open' && f.status !== 'open' && f.status !== 'in_progress') return false;
        if (filterStatus === 'resolved' && f.status !== 'resolved' && f.status !== 'closed') return false;
        if (filterTag && !(f.tags || []).includes(filterTag)) return false;
        return true;
    }).sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', textTransform: 'uppercase', color: 'var(--color-text)' }}>
                        {t('admin.feedback.title')}
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button
                            onClick={() => setFilterStatus('open')}
                            style={{
                                background: filterStatus === 'open' ? 'var(--color-text)' : 'transparent',
                                color: filterStatus === 'open' ? 'var(--color-background)' : 'var(--color-text)',
                                border: '2px solid var(--color-text)',
                                padding: '4px 12px',
                                fontWeight: 'bold',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            En cours ({feedbacks.filter(f => f.status === 'open' || f.status === 'in_progress').length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('resolved')}
                            style={{
                                background: filterStatus === 'resolved' ? 'var(--color-text)' : 'transparent',
                                color: filterStatus === 'resolved' ? 'var(--color-background)' : 'var(--color-text)',
                                border: '2px solid var(--color-text)',
                                padding: '4px 12px',
                                fontWeight: 'bold',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Résolus ({feedbacks.filter(f => f.status === 'resolved' || f.status === 'closed').length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('all')}
                            style={{
                                background: filterStatus === 'all' ? 'var(--color-text)' : 'transparent',
                                color: filterStatus === 'all' ? 'var(--color-background)' : 'var(--color-text)',
                                border: '2px solid var(--color-text)',
                                padding: '4px 12px',
                                fontWeight: 'bold',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Tout ({feedbacks.length})
                        </button>
                    </div>
                </div>
                <button
                    onClick={loadFeedback}
                    style={{
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        color: 'var(--color-text)',
                        background: 'none',
                        border: 'none'
                    }}
                >
                    {t('admin.feedback.refresh')}
                </button>
            </div>

            {/* Tag Filter + Bulk Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Tag size={14} style={{ opacity: 0.5 }} />
                    {AVAILABLE_TAGS.map(tag => (
                        <button
                            key={tag}
                            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                            style={{
                                padding: '2px 8px',
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                border: '1px solid var(--color-border)',
                                background: filterTag === tag ? 'var(--color-text)' : 'transparent',
                                color: filterTag === tag ? 'var(--color-background)' : 'var(--color-text)',
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                            }}
                        >
                            {tag}
                        </button>
                    ))}
                </div>

                {selectedIds.size > 0 && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.4rem 0.75rem', background: '#1e1b4b', color: 'white',
                        border: '2px solid #312e81', fontSize: '0.75rem', fontWeight: 900
                    }}>
                        <span>{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
                        <button onClick={handleBulkResolve} style={{ background: '#10b981', color: 'white', border: 'none', padding: '2px 8px', cursor: 'pointer', fontWeight: 900, fontSize: '0.7rem' }}>Résoudre</button>
                        <button onClick={handleBulkCopyForAI} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '2px 8px', cursor: 'pointer', fontWeight: 900, fontSize: '0.7rem' }}>Copier IA</button>
                        <button onClick={handleBulkDelete} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '2px 8px', cursor: 'pointer', fontWeight: 900, fontSize: '0.7rem' }}>Supprimer</button>
                        <button onClick={() => setSelectedIds(new Set())} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loading ? (
                    <p style={{ color: 'black' }}>{t('admin.feedback.loading')}</p>
                ) : filteredFeedbacks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-dim)', background: 'var(--color-surface)', border: '2px dashed var(--color-border)' }}>
                        {t('admin.feedback.no_messages')}
                    </div>
                ) : (
                    <>
                    {/* Select all */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
                        <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-text-dim)' }}>
                            {selectedIds.size === filteredFeedbacks.length ? <CheckSquare size={16} /> : <Square size={16} />}
                            {selectedIds.size === filteredFeedbacks.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                    </div>
                    {filteredFeedbacks.map((item) => (
                        <Card
                            key={item.id}
                            variant="manga"
                            style={{
                                padding: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                background: selectedIds.has(item.id) ? 'color-mix(in srgb, var(--color-surface) 90%, #8b5cf6)' : 'var(--color-surface)',
                                border: selectedIds.has(item.id) ? '3px solid #8b5cf6' : '3px solid var(--color-border)',
                                boxShadow: expandedId === item.id ? '8px 8px 0 var(--color-shadow-strong)' : '4px 4px 0 var(--color-shadow-strong)',
                                transition: 'all 0.2s ease',
                                color: 'var(--color-text)'
                            }}
                        >
                            {/* Summary View */}
                            <div
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                                    {/* Checkbox */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text)' }}
                                    >
                                        {selectedIds.has(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </button>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
                                        <StatusBadge status={item.status} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, marginTop: '4px', color: getPriorityColor(item.priority) }}>
                                            {item.priority?.toUpperCase() || 'MEDIUM'}
                                        </span>
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.1rem', textTransform: 'uppercase' }}>
                                                {item.userName || 'Anonyme'}
                                            </h3>
                                            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>• {new Date(item.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <p style={{
                                            margin: '4px 0 0',
                                            fontSize: '0.9rem',
                                            opacity: 0.8,
                                            display: '-webkit-box',
                                            WebkitLineClamp: expandedId === item.id ? 'unset' : 1,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>
                                            {item.message}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#000', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                        <Star size={12} fill="white" /> {item.rating}
                                    </div>
                                    {item.attachments?.length > 0 && (
                                        <ImageIcon size={18} style={{ opacity: 0.5 }} />
                                    )}
                                    {(item.adminResponses?.length || 0) > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}>
                                            <MessageSquare size={16} />
                                            <span style={{ fontWeight: 'bold' }}>{item.adminResponses.length}</span>
                                        </div>
                                    )}
                                    {expandedId === item.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                </div>
                            </div>

                            {/* Expanded View */}
                            {expandedId === item.id && (
                                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #eee', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                    {/* Info Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5 }}>Catégorie</label>
                                            <p style={{ margin: '4px 0', fontWeight: 'bold' }}>{item.category?.toUpperCase() || 'GENERAL'}</p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5 }}>E-mail</label>
                                            <p style={{ margin: '4px 0', fontWeight: 'bold' }}>
                                                {item.contactEmail ? (
                                                    <a href={`mailto:${item.contactEmail}`} style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        {item.contactEmail} <ExternalLink size={12} />
                                                    </a>
                                                ) : 'Non fourni'}
                                            </p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5 }}>User Agent</label>
                                            <p style={{ margin: '4px 0', fontSize: '0.7rem', opacity: 0.6 }}>{item.userAgent || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Full Message */}
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5 }}>Message Complet</label>
                                        <p style={{ margin: '8px 0', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#f8f8f8', padding: '1rem', border: '1px solid #ddd' }}>
                                            {item.message}
                                        </p>
                                    </div>

                                    {/* Copy for AI Button */}
                                    <button
                                        onClick={() => handleCopyForAI(item)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.6rem 1.2rem',
                                            background: copiedId === item.id
                                                ? 'linear-gradient(135deg, #10b981, #059669)'
                                                : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                            color: 'white',
                                            border: '2px solid black',
                                            boxShadow: '3px 3px 0 black',
                                            cursor: 'pointer',
                                            fontWeight: 900,
                                            fontSize: '0.8rem',
                                            textTransform: 'uppercase',
                                            fontFamily: 'var(--font-heading)',
                                            letterSpacing: '0.05em',
                                            transition: 'all 0.2s ease',
                                            alignSelf: 'flex-start'
                                        }}
                                    >
                                        {copiedId === item.id ? (
                                            <><Check size={16} /> Prompt copié !</>
                                        ) : (
                                            <><Clipboard size={16} /> Copier pour IA</>
                                        )}
                                    </button>

                                    {/* Attachments */}
                                    {item.attachments && item.attachments.length > 0 && (
                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5 }}>Pièces Jointes</label>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                {item.attachments.map((url, idx) => {
                                                    const imageKey = `${item.id}-${idx}`;
                                                    return (
                                                        <div key={idx} style={{ position: 'relative' }}>
                                                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100px', height: '100px', border: '2px solid black', overflow: 'hidden' }}>
                                                                <OptimizedImage src={url} alt="Attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </a>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleCopyImage(url, imageKey);
                                                                }}
                                                                title="Copier l'image"
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: '4px',
                                                                    right: '4px',
                                                                    width: '28px',
                                                                    height: '28px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    background: copiedImageIdx === imageKey ? '#10b981' : 'rgba(0,0,0,0.75)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease',
                                                                    zIndex: 2
                                                                }}
                                                            >
                                                                {copiedImageIdx === imageKey ? <Check size={14} /> : <Copy size={14} />}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Admin Controls */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem', background: '#f5f5f5', border: '2px solid black' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>Changer Statut</label>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {(['open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => handleStatusUpdate(item.id, s)}
                                                        style={{
                                                            padding: '4px 8px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 'bold',
                                                            background: item.status === s ? 'black' : 'white',
                                                            color: item.status === s ? 'white' : 'black',
                                                            border: '1px solid black',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {s.replace('_', ' ').toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>Changer Priorité</label>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => handlePriorityUpdate(item.id, p)}
                                                        style={{
                                                            padding: '4px 8px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 'bold',
                                                            background: item.priority === p ? getPriorityColor(p) : 'white',
                                                            color: item.priority === p ? 'white' : 'black',
                                                            border: '1px solid black',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {p.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            style={{ marginLeft: 'auto', alignSelf: 'center', background: '#fee2e2', color: '#ef4444', border: '2px solid #ef4444', padding: '8px', cursor: 'pointer', borderRadius: '4px' }}
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    {/* Tags */}
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5 }}>Tags</label>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                                            {AVAILABLE_TAGS.map(tag => {
                                                const active = (item.tags || []).includes(tag);
                                                return (
                                                    <button
                                                        key={tag}
                                                        onClick={() => handleToggleTag(item.id, tag)}
                                                        style={{
                                                            padding: '2px 8px',
                                                            fontSize: '0.65rem',
                                                            fontWeight: 900,
                                                            background: active ? '#1e1b4b' : 'white',
                                                            color: active ? 'white' : '#374151',
                                                            border: '1px solid ' + (active ? '#312e81' : '#d1d5db'),
                                                            cursor: 'pointer',
                                                            textTransform: 'uppercase',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        {tag}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Response Section */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.8rem',
                                            fontWeight: 900,
                                            textTransform: 'uppercase'
                                        }}>
                                            <MessageSquare size={16} /> Conversation / Historique
                                        </label>

                                        {/* Response History */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {(!item.adminResponses || item.adminResponses.length === 0) ? (
                                                <p style={{ fontSize: '0.8rem', fontStyle: 'italic', opacity: 0.5 }}>Aucun message envoyé.</p>
                                            ) : (
                                                item.adminResponses.map((res, idx) => (
                                                    <div key={idx} style={{ padding: '0.75rem', background: '#e0f2fe', borderLeft: '4px solid #0ea5e9', fontSize: '0.9rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.6 }}>
                                                            <span>{res.adminName} (ADMIN)</span>
                                                            <span>{new Date(res.timestamp).toLocaleString()}</span>
                                                        </div>
                                                        {res.message}
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* New Response Form */}
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <textarea
                                                value={responseText}
                                                onChange={(e) => setResponseText(e.target.value)}
                                                placeholder="Écrire une réponse à l'utilisateur..."
                                                style={{
                                                    flex: 1,
                                                    padding: '0.75rem',
                                                    border: '2px solid black',
                                                    minHeight: '80px',
                                                    fontSize: '0.9rem',
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                            <button
                                                onClick={() => handleSendResponse(item.id)}
                                                disabled={isSubmittingResponse || !responseText.trim()}
                                                style={{
                                                    background: 'black',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '0 1.5rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {isSubmittingResponse ? '...' : <><Send size={18} /> Répondre</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                    </>
                )}
            </div>
        </div>
    );
}
