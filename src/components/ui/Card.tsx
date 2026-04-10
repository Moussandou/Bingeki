/**
 * Card component (ui)
 */
import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';
import styles from './Card.module.css';

interface CardProps extends HTMLMotionProps<"div"> {
    variant?: 'default' | 'glass' | 'manga';
    hoverable?: boolean;
    children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', hoverable = false, children, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                data-hoverable={hoverable}
                className={cn(
                    styles.card,
                    variant === 'glass' && styles.glass,
                    variant === 'manga' && 'manga-panel',
                    hoverable && variant !== 'manga' && styles.hoverable,
                    className
                )}
                initial={false}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

Card.displayName = "Card";
