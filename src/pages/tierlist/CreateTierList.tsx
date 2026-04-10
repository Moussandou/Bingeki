/**
 * Create Tier List page
 */
import { useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';
import {
    DndContext,
    DragOverlay,
    rectIntersection,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import type {
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    DropAnimation
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Save, Download, Trash2, Plus, Upload, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createTierList, type TierList } from '@/firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { Modal } from '@/components/ui/Modal';

import { TierRow } from '@/components/tierlist/TierRow';
import { CharacterPoolControls, CharacterPoolResults, useCharacterPool } from '@/components/tierlist/CharacterPool';
import { useToast } from '@/context/ToastContext';
import styles from './CreateTierList.module.css';

// Types derived from TierList to ensure consistency
type Tier = TierList['tiers'][number];
type TierItem = Tier['items'][number];

const TITLE_MAX_LENGTH = 100;
const MAX_ITEMS_PER_TIER = 20;

// Pool Item Type (matches what comes from CharacterPool)
interface PoolDragItem {
    mal_id: number;
    name: string;
    images: {
        jpg: {
            image_url: string;
        };
    };
}

// Work drag item (anime or manga dragged directly into a tier)
interface WorkDragItem {
    mal_id: number;
    title: string;
    images: {
        jpg: {
            image_url: string;
        };
    };
}


export default function CreateTierList() {
    const { t } = useTranslation();
    const { lang } = useParams();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const tiersRef = useRef<HTMLDivElement>(null);

    // Pool state (lifted so controls and results can be in different layout slots)
    const pool = useCharacterPool();

    // State
    const [title, setTitle] = useState(t('tierlist.default_title'));
    const [tiers, setTiers] = useState<Tier[]>([
        { id: 'S', label: 'S', color: '#ff7f7f', items: [] },
        { id: 'A', label: 'A', color: '#ffbf7f', items: [] },
        { id: 'B', label: 'B', color: '#ffdf7f', items: [] },
        { id: 'C', label: 'C', color: '#ffff7f', items: [] },
        { id: 'D', label: 'D', color: '#bfff7f', items: [] },
    ]);
    const [activeId, setActiveId] = useState<string | null>(null);
    // Active item can be from Pool (PoolDragItem | WorkDragItem) or Tier (TierItem)
    const [activeItem, setActiveItem] = useState<PoolDragItem | WorkDragItem | TierItem | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
    } | null>(null);

    const usedCharacterIds = tiers.flatMap(t => t.items.map(i => i.id));

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const findContainer = (id: string) => {
        if (id === 'pool' || id.startsWith('pool-')) return 'pool';
        if (tiers.find(t => t.id === id)) return id;
        return tiers.find(t => t.items.some(i => `${t.id}-${i.id}` === id))?.id;
    };

    const handleRemoveItem = (tierId: string, itemId: number | string) => {
        setTiers(prev => prev.map(tier =>
            tier.id === tierId
                ? { ...tier, items: tier.items.filter(i => i.id !== itemId) }
                : tier
        ));
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const id = active.id as string;
        setActiveId(id);

        if (id.startsWith('pool-work-')) {
            setActiveItem(active.data.current?.work as WorkDragItem);
        } else if (id.startsWith('pool-')) {
            setActiveItem(active.data.current?.character as PoolDragItem);
        } else {
            // Find item in tiers
            for (const tier of tiers) {
                const item = tier.items.find(i => `${tier.id}-${i.id}` === id);
                if (item) {
                    setActiveItem(item);
                    break;
                }
            }
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId || overId === 'trash') return;

        const activeContainer = findContainer(active.id as string);
        const overContainer = findContainer(overId as string);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        // Logic for moving between tiers while dragging
        if (activeContainer !== 'pool' && overContainer !== 'pool') {
            setTiers((prev) => {
                const activeItems = prev.find((t) => t.id === activeContainer)?.items || [];
                const overItems = prev.find((t) => t.id === overContainer)?.items || [];

                const activeIndex = activeItems.findIndex((i) => `${activeContainer}-${i.id}` === active.id);
                const overIndex = overItems.findIndex((i) => `${overContainer}-${i.id}` === over.id);

                let newIndex: number;
                if (prev.find((t) => t.id === overId)) {
                    newIndex = overItems.length;
                } else {
                    const isBelowLastItem = over && overIndex === overItems.length - 1;
                    const modifier = isBelowLastItem ? 1 : 0;
                    newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length;
                }

                const item = activeItems[activeIndex];
                if (!item) return prev;

                return prev.map((tier) => {
                    if (tier.id === activeContainer) {
                        return { ...tier, items: tier.items.filter((_, i) => i !== activeIndex) };
                    }
                    if (tier.id === overContainer) {
                        const newTierItems = [...tier.items];
                        newTierItems.splice(newIndex, 0, item);
                        return { ...tier, items: newTierItems };
                    }
                    return tier;
                });
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const activeContainer = findContainer(active.id as string);
        const overContainer = over ? findContainer(over.id as string) : null;

        if (!overContainer || !over) {
            setActiveId(null);
            setActiveItem(null);
            return;
        }

        // Case 1: Dragging from Pool to Tier
        if (activeContainer === 'pool') {
            if (active.id.toString().startsWith('pool-work-')) {
                // Work (anime or manga) dragged into a tier
                const work = active.data.current?.work as WorkDragItem;
                if (work) {
                    setTiers(prev => {
                        const targetTier = prev.find(t => t.id === overContainer);
                        if (targetTier && targetTier.items.length >= MAX_ITEMS_PER_TIER) {
                            addToast(t('tierlist.tier_full', { max: MAX_ITEMS_PER_TIER }), 'error');
                            return prev;
                        }
                        const workItemId = `work-${work.mal_id}`;
                        const isDuplicate = prev.some(t => t.items.some(i => String(i.id) === workItemId));
                        if (isDuplicate) {
                            addToast(t('tierlist.duplicate_work'), 'error');
                            return prev;
                        }
                        return prev.map(tier => {
                            if (tier.id === overContainer) {
                                const overIndex = tier.items.findIndex(i => `${overContainer}-${i.id}` === over.id);
                                const newItems = [...tier.items];
                                const newItem = {
                                    id: workItemId,
                                    name: work.title,
                                    image: work.images?.jpg?.image_url
                                };
                                if (overIndex !== -1) {
                                    newItems.splice(overIndex, 0, newItem);
                                } else {
                                    newItems.push(newItem);
                                }
                                return { ...tier, items: newItems };
                            }
                            return tier;
                        });
                    });
                }
            } else {
                // Character dragged into a tier
                const character = active.data.current?.character;
                if (character) {
                    setTiers(prev => {
                        const targetTier = prev.find(t => t.id === overContainer);
                        if (targetTier && targetTier.items.length >= MAX_ITEMS_PER_TIER) {
                            addToast(t('tierlist.tier_full', { max: MAX_ITEMS_PER_TIER }), 'error');
                            return prev;
                        }
                        const isDuplicate = prev.some(t => t.items.some(i => String(i.id) === String(character.mal_id)));
                        if (isDuplicate) {
                            addToast(t('tierlist.duplicate_character'), 'error');
                            return prev;
                        }
                        return prev.map(tier => {
                            if (tier.id === overContainer) {
                                const overIndex = tier.items.findIndex(i => `${overContainer}-${i.id}` === over.id);
                                const newItems = [...tier.items];
                                const newItem = {
                                    id: character.mal_id,
                                    name: character.name,
                                    image: character.images?.jpg?.image_url
                                };
                                if (overIndex !== -1) {
                                    newItems.splice(overIndex, 0, newItem);
                                } else {
                                    newItems.push(newItem);
                                }
                                return { ...tier, items: newItems };
                            }
                            return tier;
                        });
                    });
                }
            }
        }
        // Case 2: Reordering within same Tier (Moving between tiers is handled by handleDragOver)
        else if (activeContainer === overContainer) {
            const activeItems = tiers.find(t => t.id === activeContainer)?.items || [];
            const activeIndex = activeItems.findIndex(i => `${activeContainer}-${i.id}` === active.id);
            const overIndex = activeItems.findIndex(i => `${overContainer}-${i.id}` === over.id);

            if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
                setTiers(prev => prev.map(tier => {
                    if (tier.id === activeContainer) {
                        return { ...tier, items: arrayMove(tier.items, activeIndex, overIndex) };
                    }
                    return tier;
                }));
            }
        }

        setActiveId(null);
        setActiveItem(null);
    };

    const handleExportImage = async () => {
        if (!tiersRef.current) return;
        try {
            const canvas = await html2canvas(tiersRef.current, {
                backgroundColor: '#111',
                scale: 2,
                useCORS: true, // Important for external images
                allowTaint: true
            });
            const link = document.createElement('a');
            link.download = `${title.replace(/\s+/g, '_')}_tierlist.png`;
            link.href = canvas.toDataURL();
            link.click();
            addToast(t('tierlist.export_success'), 'success');
        } catch (error) {
            logger.error(error);
            addToast(t('tierlist.export_error'), 'error');
        }
    };

    const handleSave = async () => {
        if (!user) {
            addToast(t('auth.login_required'), 'error');
            return;
        }

        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            addToast(t('tierlist.title_required'), 'error');
            return;
        }
        if (trimmedTitle.length > TITLE_MAX_LENGTH) {
            addToast(t('tierlist.title_too_long'), 'error');
            return;
        }

        try {
            await createTierList({
                userId: user.uid,
                authorName: user.displayName || 'Anonymous',
                authorPhoto: user.photoURL || '',
                title: trimmedTitle,
                category: 'characters',
                likes: [],
                isPublic: true,
                createdAt: Date.now(),
                tiers: tiers
            });
            addToast(t('tierlist.save_success'), 'success');
            navigate(`/${lang}/profile`);
        } catch (error) {
            logger.error(error);
            addToast(t('tierlist.save_error'), 'error');
        }
    };

    const handleAddTier = (index?: number, offset: number = 1) => {
        const newId = `tier-${Date.now()}`;
        const newTier: Tier = { id: newId, label: 'NEW', color: '#888', items: [] };

        setTiers(prev => {
            if (index === undefined) return [...prev, newTier];
            const newTiers = [...prev];
            const insertIndex = index + (offset > 0 ? 1 : 0);
            newTiers.splice(insertIndex, 0, newTier);
            return newTiers;
        });
    };

    const handleDeleteTier = (index: number) => {
        setConfirmModal({
            title: t('tierlist.delete_tier'),
            message: t('tierlist.delete_tier_confirm'),
            onConfirm: () => {
                setTiers(prev => {
                    if (prev.length <= 1) return prev;
                    return prev.filter((_, i) => i !== index);
                });
                setConfirmModal(null);
            }
        });
    };

    const handleMoveTier = (index: number, direction: 'up' | 'down') => {
        setTiers(prev => {
            const nextIndex = direction === 'up' ? index - 1 : index + 1;
            if (nextIndex < 0 || nextIndex >= prev.length) return prev;
            return arrayMove(prev, index, nextIndex);
        });
    };

    const handleClearTier = (index: number) => {
        setTiers(prev => prev.map((t, i) => i === index ? { ...t, items: [] } : t));
    };

    const handleClearAll = () => {
        setConfirmModal({
            title: t('tierlist.clear_all'),
            message: t('tierlist.clear_all_confirm'),
            onConfirm: () => {
                setTiers(prev => prev.map(t => ({ ...t, items: [] })));
                setConfirmModal(null);
            }
        });
    };

    const handleImportJSON = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string);
                    if (data.tiers && Array.isArray(data.tiers)) {
                        setTiers(data.tiers);
                        if (data.title) setTitle(data.title);
                        addToast(t('tierlist.import_success'), 'success');
                    } else {
                        throw new Error('Invalid format');
                    }
                } catch (error) {
                    addToast(t('tierlist.import_error'), 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleExportJSON = () => {
        const data = { title, tiers };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/\s+/g, '_')}_tierlist.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    return (
        <Layout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.titleInputContainer}>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={styles.titleInput}
                        />
                    </div>
                    <div className={styles.actions}>
                        <Button
                            onClick={() => handleAddTier()}
                            variant="manga"
                            icon={<Plus size={18} />}
                        >
                            {t('tierlist.add_tier')}
                        </Button>
                        <Button
                            onClick={handleClearAll}
                            variant="manga"
                            className={styles.clearButton}
                            icon={<Trash2 size={18} />}
                        >
                            {t('tierlist.clear_all')}
                        </Button>
                        <Button
                            onClick={handleImportJSON}
                            variant="manga"
                            icon={<Upload size={18} />}
                        >
                            {t('tierlist.import_json')}
                        </Button>
                        <Button
                            onClick={handleExportJSON}
                            variant="manga"
                            icon={<FileCode size={18} />}
                        >
                            {t('tierlist.export_json')}
                        </Button>
                        <Button
                            onClick={handleExportImage}
                            variant="manga"
                            icon={<Download size={18} />}
                        >
                            {t('tierlist.export_button')}
                        </Button>
                        <Button
                            onClick={handleSave}
                            variant="primary"
                            icon={<Save size={18} />}
                        >
                            {t('tierlist.save_button')}
                        </Button>
                    </div>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={rectIntersection}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className={styles.workspace}>
                        {/* Top row: tier board + search controls */}
                        <div className={styles.mainArea}>
                            <div ref={tiersRef} className={styles.board}>
                                {tiers.map((tier, index) => (
                                    <TierRow
                                        key={tier.id}
                                        tier={tier}
                                        onLabelChange={(val) => {
                                            const newTiers = [...tiers];
                                            newTiers[index].label = val;
                                            setTiers(newTiers);
                                        }}
                                        onColorChange={(val) => {
                                            const newTiers = [...tiers];
                                            newTiers[index].color = val;
                                            setTiers(newTiers);
                                        }}
                                        onDelete={() => handleDeleteTier(index)}
                                        onMoveUp={() => handleMoveTier(index, 'up')}
                                        onMoveDown={() => handleMoveTier(index, 'down')}
                                        onAddAbove={() => handleAddTier(index, -1)}
                                        onAddBelow={() => handleAddTier(index, 1)}
                                        onClear={() => handleClearTier(index)}
                                        onRemoveItem={(itemId) => handleRemoveItem(tier.id, itemId)}
                                        isFirst={index === 0}
                                        isLast={index === tiers.length - 1}
                                    />
                                ))}
                            </div>

                            <div className={styles.controlsPanel}>
                                <CharacterPoolControls pool={pool} />
                            </div>
                        </div>

                        {/* Results panel — full width below */}
                        <div className={styles.resultsPanel}>
                            <CharacterPoolResults pool={pool} usedCharacterIds={usedCharacterIds} />
                        </div>
                    </div>

                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeId && activeItem ? (
                            <div style={{
                                width: '80px',
                                height: '80px',
                                backgroundImage: `url(${'images' in activeItem ? activeItem.images.jpg.image_url : activeItem.image})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                borderRadius: '4px',
                                border: '2px solid var(--color-border-heavy)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }} />
                        ) : null}
                    </DragOverlay>

                    {confirmModal && (
                        <Modal
                            isOpen={!!confirmModal}
                            onClose={() => setConfirmModal(null)}
                            title={confirmModal.title}
                        >
                            <div className={styles.confirmContent}>
                                <p>{confirmModal.message}</p>
                                <div className={styles.confirmActions}>
                                    <Button onClick={() => setConfirmModal(null)} variant="manga">
                                        {t('common.cancel')}
                                    </Button>
                                    <Button onClick={confirmModal.onConfirm} variant="primary">
                                        {t('common.confirm')}
                                    </Button>
                                </div>
                            </div>
                        </Modal>
                    )}
                </DndContext>
            </div>
        </Layout>
    );
}
