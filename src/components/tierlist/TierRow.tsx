
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem, TierItemDisplay } from './SortableItem';
import { X } from 'lucide-react';

interface TierItem {
    id: number | string;
    name: string;
    image: string;
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
    readOnly?: boolean;
}

export function TierRow({ tier, onLabelChange, onColorChange, onDelete, readOnly = false }: TierRowProps) {
    const { t } = useTranslation();
    const { setNodeRef } = useDroppable({
        id: tier.id,
        disabled: readOnly
    });

    return (
        <div style={{ display: 'flex', marginBottom: '4px', minHeight: '100px', background: '#1a1a1a' }}>
            {/* Label Column */}
            <div style={{
                width: '100px',
                background: tier.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                padding: '0.5rem',
                border: '3px solid var(--color-border-heavy)',
                borderRight: 'none',
                position: 'relative'
            }}>
                {readOnly ? (
                    <div style={{
                        textAlign: 'center',
                        fontWeight: 900,
                        fontSize: '1.5rem',
                        color: '#000',
                        fontFamily: 'var(--font-heading)',
                        wordBreak: 'break-word'
                    }}>
                        {tier.label}
                    </div>
                ) : (
                    <>
                        <input
                            value={tier.label}
                            onChange={(e) => onLabelChange && onLabelChange(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'center',
                                fontWeight: 900,
                                fontSize: '1.5rem',
                                width: '100%',
                                color: '#000',
                                outline: 'none',
                                fontFamily: 'var(--font-heading)'
                            }}
                        />
                        <input
                            type="color"
                            value={tier.color}
                            onChange={(e) => onColorChange && onColorChange(e.target.value)}
                            style={{
                                width: '20px',
                                height: '20px',
                                border: '2px solid black',
                                padding: 0,
                                cursor: 'pointer',
                                marginTop: '0.5rem'
                            }}
                        />
                    </>
                )}
            </div>

            {/* Droppable Area */}
            {readOnly ? (
                <div style={{
                    flex: 1,
                    background: '#262626',
                    border: '3px solid var(--color-border-heavy)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    alignItems: 'center'
                }}>
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
                    <div
                        ref={setNodeRef}
                        style={{
                            flex: 1,
                            background: '#262626',
                            border: '3px solid var(--color-border-heavy)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            alignItems: 'center'
                        }}
                    >
                        {tier.items.map((item) => (
                            <SortableItem
                                key={`${tier.id}-${item.id}`}
                                id={`${tier.id}-${item.id}`}
                                character={item}
                            />
                        ))}
                        {tier.items.length === 0 && (
                            <div style={{ opacity: 0.2, color: 'white', width: '100%', textAlign: 'center' }}>
                                {t('tierlist.drop_items_here')}
                            </div>
                        )}
                    </div>
                </SortableContext>
            )}

            {/* Controls */}
            {!readOnly && (
                <div style={{
                    background: '#111',
                    width: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid var(--color-border-heavy)',
                    borderLeft: 'none'
                }}>
                    {onDelete && (
                        <button onClick={onDelete} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
