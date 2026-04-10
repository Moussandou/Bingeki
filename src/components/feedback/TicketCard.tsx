/**
 * Ticket Card component (feedback)
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FeedbackData } from '@/firebase/firestore';
import { StatusBadge } from './StatusBadge';
import { Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import styles from './TicketCard.module.css';

interface TicketCardProps {
    ticket: FeedbackData;
}

export const TicketCard = ({ ticket }: TicketCardProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
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

    return (
        <div
            className={styles.card}
            onClick={() => navigate(`/feedback/ticket/${ticket.id}`)}
        >
            <div className={styles.header}>
                <StatusBadge status={ticket.status} />
                <span className={styles.category}>
                    {t(`feedback.category_${ticket.category}`)}
                </span>
            </div>

            <h3 className={styles.messagePreview}>
                {ticket.message.length > 100
                    ? `${ticket.message.substring(0, 100)}...`
                    : ticket.message}
            </h3>

            <div className={styles.footer}>
                <div className={styles.infoGroup}>
                    <Calendar size={14} />
                    <span>{formatDate(ticket.timestamp)}</span>
                </div>

                <div className={styles.infoGroup}>
                    <AlertCircle size={14} color={getPriorityColor(ticket.priority)} />
                    <span style={{ color: getPriorityColor(ticket.priority), fontWeight: 'bold' }}>
                        {t(`feedback.priority_${ticket.priority}`)}
                    </span>
                </div>

                {ticket.adminResponses.length > 0 && (
                    <div className={styles.infoGroup}>
                        <MessageSquare size={14} />
                        <span className={styles.responsesCount}>
                            {ticket.adminResponses.length}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
