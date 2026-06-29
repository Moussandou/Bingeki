import type { UserProfile } from '@/firebase/users';
import styles from './Orga.module.css';

interface MemberFilterProps {
    members: UserProfile[];
    activeFilter: string | null;
    onFilter: (uid: string | null) => void;
}

export function MemberFilter({ members, activeFilter, onFilter }: MemberFilterProps) {
    return (
        <div className={styles.filterBar}>
            <button
                className={`${styles.filterPill} ${activeFilter === null ? styles.filterPillActive : ''}`}
                onClick={() => onFilter(null)}
            >
                Tous
            </button>
            {members.map(m => (
                <button
                    key={m.uid}
                    className={`${styles.filterPill} ${activeFilter === m.uid ? styles.filterPillActive : ''}`}
                    onClick={() => onFilter(m.uid)}
                >
                    {m.displayName || m.uid.slice(0, 6)}
                </button>
            ))}
        </div>
    );
}
