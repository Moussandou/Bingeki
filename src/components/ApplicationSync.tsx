import { useEffect } from 'react';
import { subscribeToGlobalConfig } from '@/firebase/firestore';
import { useAuthSync } from '@/hooks/useAuthSync';
import { useFirestoreSync } from '@/hooks/useFirestoreSync';
import { UsernameSelectionModal } from '@/components/auth/UsernameSelectionModal';

export default function ApplicationSync({ onConfig }: { onConfig: (maintenance: boolean) => void }) {
    useAuthSync();
    useFirestoreSync();
    useEffect(() => subscribeToGlobalConfig(config => onConfig(config?.maintenance ?? false)), [onConfig]);
    return <UsernameSelectionModal />;
}
