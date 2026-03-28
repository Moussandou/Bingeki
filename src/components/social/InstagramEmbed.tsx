import React, { useEffect } from 'react';

interface InstagramEmbedProps {
  url: string;
}

declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

export const InstagramEmbed: React.FC<InstagramEmbedProps> = ({ url }) => {
  useEffect(() => {
    // Function to load the Instagram script if it's not already there
    const loadScript = () => {
      const existingScript = document.getElementById('instagram-embed-script');
      
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'instagram-embed-script';
        script.src = 'https://www.instagram.com/embed.js';
        script.async = true;
        script.onload = () => {
          if (window.instgrm) {
            window.instgrm.Embeds.process();
          }
        };
        document.body.appendChild(script);
      } else {
        // If the script is already loaded, we need to wait for a tick 
        // to ensure the new blockquote is in the DOM before processing
        setTimeout(() => {
          if (window.instgrm) {
            window.instgrm.Embeds.process();
          }
        }, 100);
      }
    };

    loadScript();
  }, [url]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '400px' }}>
      <blockquote
        className="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: '#FFF',
          border: '0',
          borderRadius: '12px',
          boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
          margin: '1px',
          maxWidth: '540px',
          minWidth: '326px',
          padding: '0',
          width: 'calc(100% - 2px)',
        }}
      >
        <div style={{ padding: '16px' }}>
          <a
            href={url}
            style={{
              background: '#FFFFFF',
              lineHeight: '0',
              padding: '0 0',
              textAlign: 'center',
              textDecoration: 'none',
              width: '100%',
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <div
                style={{
                  backgroundColor: '#F4F4F4',
                  borderRadius: '50%',
                  flexGrow: 0,
                  height: '40px',
                  marginRight: '14px',
                  width: '40px',
                }}
              ></div>
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifySelf: 'center' }}>
                <div
                  style={{
                    backgroundColor: '#F4F4F4',
                    borderRadius: '4px',
                    flexGrow: 0,
                    height: '14px',
                    marginBottom: '6px',
                    width: '100px',
                  }}
                ></div>
                <div
                  style={{
                    backgroundColor: '#F4F4F4',
                    borderRadius: '4px',
                    flexGrow: 0,
                    height: '14px',
                    width: '60px',
                  }}
                ></div>
              </div>
            </div>
            <div style={{ padding: '19% 0' }}></div>
            <div style={{ display: 'block', height: '50px', margin: '0 auto 12px', width: '50px' }}>
              <svg
                width="50px"
                height="50px"
                viewBox="0 0 60 60"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="#c9cccd"
                  d="M30 0C13.431 0 0 13.431 0 30s13.431 30 30 30 30-13.431 30-30S46.569 0 30 0z"
                />
              </svg>
            </div>
            <div style={{ paddingTop: '8px' }}>
              <div
                style={{
                  color: '#3897f0',
                  fontFamily: 'Arial,sans-serif',
                  fontSize: '14px',
                  fontStyle: 'normal',
                  fontWeight: 550,
                  lineHeight: '18px',
                }}
              >
                Chargement de la publication Instagram...
              </div>
            </div>
          </a>
        </div>
      </blockquote>
    </div>
  );
};
