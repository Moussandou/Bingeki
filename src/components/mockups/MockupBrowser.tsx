/**
 * Mockup Browser component (mockups)
 */
import React from 'react';

interface MockupBrowserProps {
    url?: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
}

export function MockupPhone({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) {
    return (
        <div style={{
            width: '375px',
            height: '812px',
            borderRadius: '40px',
            border: '14px solid #1a1a1a',
            background: '#fff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 50px -12px rgba(0,0,0,0.5)',
            margin: '0 auto',
            ...style
        }}>
            {/* Notch */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '150px',
                height: '30px',
                background: '#1a1a1a',
                borderBottomLeftRadius: '20px',
                borderBottomRightRadius: '20px',
                zIndex: 1000
            }} />

            {/* Content Area */}
            <div style={{
                width: '100%',
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarWidth: 'none', // Hide scrollbar
                ...style // Allow overriding inner styles if needed
            }}>
                {children}
            </div>
        </div>
    );
}

export function MockupBrowser({ url = 'bingeki.app', children, style }: MockupBrowserProps) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px -12px rgba(0,0,0,0.5)',
            border: '1px solid #333',
            background: '#000',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            ...style
        }}>
            {/* Browser Toolbar */}
            <div style={{
                background: '#1a1a1a',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                borderBottom: '1px solid #333'
            }}>
                {/* Window Controls */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FF5F57' }} />
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FEBC2E' }} />
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28C840' }} />
                </div>

                {/* Address Bar */}
                <div style={{
                    flex: 1,
                    background: '#000',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    color: '#888',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #333'
                }}>
                    <span style={{ color: '#444', marginRight: '4px' }}>https://</span>
                    <span style={{ color: '#fff' }}>{url}</span>
                </div>
            </div>

            {/* Content Area */}
            <div style={{
                flex: 1,
                background: '#fff',
                position: 'relative',
                overflowY: 'auto'
            }}>
                {children}
            </div>
        </div>
    );
}

