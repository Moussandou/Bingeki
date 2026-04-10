/**
 * Loading Screen component (ui)
 */
import { motion } from 'framer-motion';

export function LoadingScreen() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            width: '100vw',
            background: '#fff',
            color: '#000',
            gap: '2rem'
        }}>
            {/* Brutalist Loader */}
            <div style={{
                position: 'relative',
                width: '80px',
                height: '80px',
            }}>
                <motion.div
                    animate={{
                        rotate: 360,
                    }}
                    transition={{
                        duration: 1.5,
                        ease: "linear",
                        repeat: Infinity,
                    }}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: '8px solid #000',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                    }}
                />
            </div>

            <motion.h1
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '2rem',
                    fontWeight: 900,
                    letterSpacing: '2px',
                    textTransform: 'uppercase'
                }}
            >
                CHARGEMENT
            </motion.h1>
        </div>
    );
}
