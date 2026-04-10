/**
 * Sortable Item component (tierlist)
 */
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './SortableItem.module.css';

type CharacterImage = string | { jpg: { image_url: string; small_image_url?: string; large_image_url?: string } };

function getImageUrl(image: CharacterImage): string {
    return typeof image === 'string' ? image : image.jpg.image_url;
}

interface SortableItemProps {
    id: string;
    character: {
        id: number | string;
        name: string;
        image: CharacterImage;
    };
    onRemove?: () => void;
}

export function TierItemDisplay({ character, style, isDragging, onRemove }: {
    character: SortableItemProps['character'];
    style?: React.CSSProperties;
    isDragging?: boolean;
    onRemove?: () => void;
}) {
    return (
        <div
            className={`${styles.tierItemWrapper} ${isDragging ? styles.dragging : ''}`}
            style={style}
        >
            <div
                className={styles.tierItem}
                style={{ backgroundImage: `url(${getImageUrl(character.image)})` }}
            />
            <div className={styles.nameOverlay}>
                {character.name}
            </div>
            {onRemove && (
                <button
                    className={styles.removeBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    title="Supprimer"
                >
                    ×
                </button>
            )}
        </div>
    );
}

export function SortableItem({ id, character, onRemove }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
        position: 'relative' as const,
        cursor: 'grab'
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TierItemDisplay character={character} onRemove={onRemove} />
        </div>
    );
}
