/**
 * Status Badge component (feedback)
 */
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
    const { t } = useTranslation();

    const getStatusStyles = () => {
        switch (status) {
            case 'open':
                return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }; // Orange/Yellow
            case 'in_progress':
                return { backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #3b82f6' }; // Blue
            case 'resolved':
                return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #22c55e' }; // Green
            case 'closed':
                return { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #9ca3af' }; // Gray
            default:
                return { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #9ca3af' };
        }
    };

    return (
        <span style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            display: 'inline-block',
            ...getStatusStyles()
        }}>
            {t(`feedback.status_${status}`)}
        </span>
    );
};
