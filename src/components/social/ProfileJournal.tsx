import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useLocalizedNavigate } from '@/components/routing/LocalizedLink';
import { CommunityFeed } from './CommunityFeed';
import type { UserProfile } from '@/firebase/users';
import styles from './Community.module.css';

export function ProfileJournal({ uid, title }: { uid: string; title?: UserProfile['communityTitle'] }) {
    const { t } = useTranslation('community');
    const navigate = useLocalizedNavigate();
    const [now] = useState(Date.now);
    return <section className={styles.journal}>
        <h2>{t('reviewJournal')}</h2>
        {title && (!title.expiresAt || title.expiresAt > now) && <p className={styles.authorTitle}>{t(`titles.${title.id}`)}</p>}
        <CommunityFeed authorId={uid} onOpen={id => navigate(`/social?post=${id}`)} />
    </section>;
}
