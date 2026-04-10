/**
 * Switch component (ui)
 */
import { motion } from 'framer-motion';
import styles from './Switch.module.css';

interface SwitchProps {
    isOn: boolean;
    onToggle: () => void;
    label?: string;
}

export function Switch({ isOn, onToggle, label }: SwitchProps) {
    return (
        <div className={styles.wrapper} onClick={onToggle}>
            {label && <span className={styles.label}>{label}</span>}
            <div className={styles.switch} data-ison={isOn}>
                <motion.div
                    className={styles.handle}
                    layout
                    transition={{
                        type: "spring",
                        stiffness: 700,
                        damping: 30
                    }}
                />
            </div>
        </div>
    );
}
