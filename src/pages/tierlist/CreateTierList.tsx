import { useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';
import {
    DndContext,
    DragOverlay,
    closestCorners,
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
import { Save, Download, Trash2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { Button } from '@/components/ui/Button';
import { createTierList, type TierList } from '@/firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';

import { TierRow } from '@/components/tierlist/TierRow';
import { CharacterPool } from '@/components/tierlist/CharacterPool';
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

function TrashZone() {
    const { t } = useTranslation();
    const { setNodeRef, isOver } = useDroppable({
        id: 'trash',
    });

    return (
        <div
            ref={setNodeRef}
            className={`${styles.trashZone} ${isOver ? styles.trashZoneActive : ''}`}
        >
            <Trash2 size={24} />
            <span className={styles.trashText}>
                {isOver ? t('tierlist.release_to_delete') : t('tierlist.drag_to_delete')}
            </span>
        </div>
    );
}

export default function CreateTierList() {
    const { t } = useTranslation();
    const { lang } = useParams();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const tiersRef = useRef<HTMLDivElement>(null);

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
    // Active item can be from Pool (PoolDragItem) or Tier (TierItem)
    const [activeItem, setActiveItem] = useState<PoolDragItem | TierItem | null>(null);

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const findContainer = (id: string) => {
        if (tiers.find(t => t.id === id)) return id;
        return tiers.find(t => t.items.find(i => `${t.id}-${i.id}` === id))?.id;
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const id = active.id as string;
        setActiveId(id);

        if (id.startsWith('pool-')) {
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

        if (!overId || active.id === overId) return;

        // activeContainer variable removed as it was unused
        // If sorting within same container, let DragEnd handle it.
        // If moving between containers, handle here.
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const activeContainer = active.id.toString().startsWith('pool-') ? 'pool' : findContainer(active.id as string);
        const overContainer = over ? (tiers.find(t => t.id === over.id) ? over.id : findContainer(over.id as string)) : null;

        // Calculate activeIndex here so it's available for all cases
        const activeIndex = (activeContainer && activeContainer !== 'pool')
            ? tiers.find(t => t.id === activeContainer)?.items.findIndex(i => `${activeContainer}-${i.id}` === active.id) ?? -1
            : -1;

        if (!overContainer || !over) {
            setActiveId(null);
            setActiveItem(null);
            return;
        }


        // Case 0: Dropped into Trash
        if (overContainer === 'trash') {
            if (activeContainer === 'pool') {
                // Do nothing, just cancel drag
            } else if (activeContainer && activeIndex !== -1) {
                // Remove from source tier
                setTiers(prev => prev.map(tier => {
                    if (tier.id === activeContainer) {
                        return { ...tier, items: tier.items.filter((_, idx) => idx !== activeIndex) };
                    }
                    return tier;
                }));
            }
            setActiveId(null);
            setActiveItem(null);
            return;
        }

        // Case 1: Dragging from Pool to Tier
        if (activeContainer === 'pool') {
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
                            return {
                                ...tier, items: [...tier.items, {
                                    id: character.mal_id,
                                    name: character.name,
                                    image: character.images?.jpg?.image_url
                                }]
                            };
                        }
                        return tier;
                    });
                });
            }
        }
        // Case 2: Moving between Tiers or Reordering
        else if (activeContainer && overContainer) {
            const overIndex = tiers.find(t => t.id === overContainer)?.items.findIndex(i => `${overContainer}-${i.id}` === over.id) ?? -1;

            if (activeContainer === overContainer) {
                // Reordering
                if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
                    setTiers(prev => prev.map(tier => {
                        if (tier.id === activeContainer) {
                            return { ...tier, items: arrayMove(tier.items, activeIndex, overIndex) };
                        }
                        return tier;
                    }));
                }
            } else {
                // Moving between tiers
                setTiers(prev => {
                    const sourceTier = prev.find(t => t.id === activeContainer);
                    const destTier = prev.find(t => t.id === overContainer);
                    if (!sourceTier || !destTier) return prev;

                    const item = sourceTier.items[activeIndex];

                    return prev.map(tier => {
                        if (tier.id === activeContainer) {
                            return { ...tier, items: tier.items.filter((_, idx) => idx !== activeIndex) };
                        }
                        if (tier.id === overContainer) {
                            // Insert at specific index if dropped on item, else append
                            const newItems = [...tier.items];
                            if (overIndex !== -1) {
                                newItems.splice(overIndex, 0, item);
                            } else {
                                newItems.push(item);
                            }
                            return { ...tier, items: newItems };
                        }
                        return tier;
                    });
                });
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
                        <Button onClick={handleExportImage} variant="ghost" icon={<Download size={20} />}>{t('tierlist.export_button')}</Button>
                        <Button onClick={handleSave} variant="primary" icon={<Save size={20} />}>{t('tierlist.save_button')}</Button>
                    </div>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className={styles.workspace}>
                        {/* Main Board */}
                        <div
                            ref={tiersRef}
                            className={styles.board}
                        >
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
                                />
                            ))}
                        </div>

                        <div className={styles.poolContainer}>
                            <CharacterPool />
                        </div>
                    </div>

                    {/* Trash Zone */}
                    <TrashZone />

                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeId && activeItem ? (
                            <div style={{
                                width: '80px',
                                height: '80px',
                                backgroundImage: `url(${('images' in activeItem) ? activeItem.images.jpg.image_url : activeItem.image})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                borderRadius: '4px',
                                border: '2px solid white',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }} />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </Layout>
    );
}
