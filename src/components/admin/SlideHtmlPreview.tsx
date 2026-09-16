/**
 * SlideHtmlPreview — renders a slide via the shared template inside a
 * sandboxed iframe. Fluid: fills its parent container, computes the
 * scale factor with ResizeObserver so the 1080-wide native canvas fits
 * exactly, regardless of the parent's actual width (which comes from
 * aspect-ratio + CSS grid in AdminSocial).
 *
 * The parent MUST be `position: relative` and have a defined size
 * (usually via aspect-ratio + a width constraint). The wrapper then
 * absolute-fills it.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { buildSlidesHTML } from '@/shared/socialTemplates';
import type { AnimeSlideData } from '@/shared/socialTemplates';
import type { PostType, SlideFormat } from '@/shared/socialBot';

interface Props {
    type: PostType;
    data: AnimeSlideData | AnimeSlideData[];
    slideIndex: number;
    format?: SlideFormat;
}

const NATIVE_W = 1080;
const NATIVE_H_FEED = 1350;
const NATIVE_H_STORY = 1920;

export function SlideHtmlPreview({ type, data, slideIndex, format = 'feed' }: Props) {
    const slides = useMemo(() => buildSlidesHTML(type, data), [type, data]);
    const slide = slides[slideIndex] ?? slides[0];

    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0);

    useLayoutEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        const compute = () => {
            const w = el.clientWidth;
            if (w > 0) setScale(w / NATIVE_W);
        };
        compute();
        const ro = new ResizeObserver(compute);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Recompute after the iframe DOM changes (slide switch)
    useEffect(() => {
        const el = wrapperRef.current;
        if (el && el.clientWidth > 0) setScale(el.clientWidth / NATIVE_W);
    }, [slideIndex, format]);

    const nativeH = format === 'story' ? NATIVE_H_STORY : NATIVE_H_FEED;

    if (!slide) {
        return (
            <div ref={wrapperRef} style={{
                position: 'absolute', inset: 0, background: '#000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#666', fontSize: '0.75rem', textAlign: 'center', padding: '1rem',
                fontFamily: '"Outfit", sans-serif',
            }}>
                Aucune slide
            </div>
        );
    }

    return (
        <div ref={wrapperRef} style={{
            position: 'absolute', inset: 0,
            background: '#000', overflow: 'hidden',
        }}>
            {scale > 0 && (
                <iframe
                    title={`slide-${slideIndex}`}
                    srcDoc={slide.html}
                    sandbox="allow-same-origin"
                    referrerPolicy="no-referrer"
                    style={{
                        position: 'absolute', top: 0, left: 0,
                        width: `${NATIVE_W}px`,
                        height: `${nativeH}px`,
                        border: 'none',
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        pointerEvents: 'none',
                        display: 'block',
                    }}
                />
            )}
        </div>
    );
}

export default SlideHtmlPreview;
