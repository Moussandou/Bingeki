/**
 * Input component (ui)
 */
import React from 'react';
import { cn } from '@/utils/cn';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
    icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, icon, ...props }, ref) => {
        return (
            <div className={styles.inputWrapper}>
                <input
                    ref={ref}
                    className={cn(
                        styles.input,
                        error && styles.error,
                        icon && styles.hasIcon,
                        className
                    )}
                    {...props}
                />
                {icon && <span className={styles.icon}>{icon}</span>}
            </div>
        );
    }
);

Input.displayName = "Input";
