import React from 'react';

interface MockupBrowserProps {
    url?: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
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
                overflow: 'hidden'
            }}>
                {children}
            </div>
        </div>
    );
}
