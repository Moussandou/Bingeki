
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem, TierItemDisplay } from './SortableItem';
import { Settings, ChevronUp, ChevronDown, Plus, Trash2, Eraser, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './TierRow.module.css';

interface TierItem {
    id: number | string;
    name: string;
    image: string | { jpg: { image_url: string; small_image_url?: string; large_image_url?: string } };
}

interface TierRowProps {
    tier: {
        id: string;
        label: string;
        color: string;
        items: TierItem[];
    };
    onLabelChange?: (newLabel: string) => void;
    onColorChange?: (newColor: string) => void;
    onDelete?: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onAddAbove?: () => void;
    onAddBelow?: () => void;
    onClear?: () => void;
    onRemoveItem?: (itemId: number | string) => void;
    isFirst?: boolean;
    isLast?: boolean;
    readOnly?: boolean;
}

const PALETTE = [
    '#ff7f7f', '#ffbf7f', '#ffdf7f', '#ffff7f', '#bfff7f', '#7fff7f',
    '#7fffff', '#7fbfff', '#7f7fff', '#ff7fff', '#bf7fff', '#333333', '#bfbfbf', '#ffffff'
];

export function TierRow({
    tier,
    onLabelChange,
    onColorChange,
    onDelete,
    onMoveUp,
    onMoveDown,
    onAddAbove,
    onAddBelow,
    onClear,
    onRemoveItem,
    isFirst,
    isLast,
    readOnly = false
}: TierRowProps) {
    const { t } = useTranslation();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const { setNodeRef } = useDroppable({
        id: tier.id,
        disabled: readOnly
    });

    return (
        <div className={styles.row}>
            {/* Label Column */}
            <div
                className={styles.labelCell}
                style={{ background: tier.color }}
            >
                <div className={styles.labelText}>
                    {tier.label}
                </div>
            </div>

            {/* Droppable Area */}
            {readOnly ? (
                <div className={styles.droppable}>
                    {tier.items.map((item) => (
                        <TierItemDisplay key={item.id} character={item} />
                    ))}
                </div>
            ) : (
                <SortableContext
                    id={tier.id}
                    items={tier.items.map(item => `${tier.id}-${item.id}`)}
                    strategy={horizontalListSortingStrategy}
                >
                    <div ref={setNodeRef} className={styles.droppable}>
                        {tier.items.map((item) => (
                            <SortableItem
                                key={`${tier.id}-${item.id}`}
                                id={`${tier.id}-${item.id}`}
                                character={item}
                                onRemove={onRemoveItem ? () => onRemoveItem(item.id) : undefined}
                            />
                        ))}
                        {tier.items.length === 0 && (
                            <div className={styles.dropPlaceholder}>
                                {t('tierlist.drop_items_here')}
                            </div>
                        )}
                    </div>
                </SortableContext>
            )}

            {/* Controls */}
            {!readOnly && (
                <div className={styles.controls}>
                    <Button
                        variant="manga"
                        size="icon"
                        onClick={() => setIsSettingsOpen(true)}
                        className={styles.tierActionButton}
                        title={t('common.settings')}
                    >
                        <Settings size={18} />
                    </Button>
                    <Button
                        variant="manga"
                        size="icon"
                        onClick={onMoveUp}
                        disabled={isFirst}
                        className={styles.tierActionButton}
                        title={t('tierlist.move_up')}
                    >
                        <ChevronUp size={18} />
                    </Button>
                    <Button
                        variant="manga"
                        size="icon"
                        onClick={onMoveDown}
                        disabled={isLast}
                        className={styles.tierActionButton}
                        title={t('tierlist.move_down')}
                    >
                        <ChevronDown size={18} />
                    </Button>
                </div>
            )}

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsSettingsOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>{t('tierlist.tier_settings')}</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className={styles.closeModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {/* Label Text */}
                            <div className={styles.settingGroup}>
                                <label>{t('tierlist.edit_label')}</label>
                                <input
                                    value={tier.label}
                                    onChange={(e) => onLabelChange?.(e.target.value)}
                                    className={styles.labelInput}
                                    autoFocus
                                />
                            </div>

                            {/* Color Palette */}
                            <div className={styles.settingGroup}>
                                <label>{t('tierlist.choose_color')}</label>
                                <div className={styles.palette}>
                                    {PALETTE.map(color => (
                                        <button
                                            key={color}
                                            className={`${styles.colorOption} ${tier.color === color ? styles.colorOptionActive : ''}`}
                                            style={{ background: color }}
                                            onClick={() => onColorChange?.(color)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className={styles.modalActions}>
                                <div className={styles.actionGrid}>
                                    <Button
                                        variant="manga"
                                        size="sm"
                                        icon={<Plus size={16} />}
                                        onClick={() => { onAddAbove?.(); setIsSettingsOpen(false); }}
                                    >
                                        {t('tierlist.add_above')}
                                    </Button>
                                    <Button
                                        variant="manga"
                                        size="sm"
                                        icon={<Plus size={16} />}
                                        onClick={() => { onAddBelow?.(); setIsSettingsOpen(false); }}
                                    >
                                        {t('tierlist.add_below')}
                                    </Button>
                                    <Button
                                        variant="manga"
                                        size="sm"
                                        icon={<Eraser size={16} />}
                                        onClick={() => { onClear?.(); setIsSettingsOpen(false); }}
                                    >
                                        {t('tierlist.clear_row')}
                                    </Button>
                                    <Button
                                        variant="manga"
                                        size="sm"
                                        icon={<Trash2 size={16} />}
                                        onClick={() => { onDelete?.(); setIsSettingsOpen(false); }}
                                        className={styles.deleteTierBtn}
                                    >
                                        {t('tierlist.delete_tier')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
