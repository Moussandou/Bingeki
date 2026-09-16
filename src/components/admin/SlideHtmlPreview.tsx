/**
 * SlideHtmlPreview — renders a single social bot slide via the shared
 * templates in a sandboxed iframe. Uses srcDoc so no network round
 * trip and no dependency on Storage URLs — useful while a post is
 * being generated or reviewed before Puppeteer commits the PNGs.
 *
 * The iframe uses CSS `transform: scale()` to fit into a smaller
 * preview box without loading the full 1080×1350 canvas.
 */
import { useMemo } from 'react';
import { buildSlidesHTML } from '@/shared/socialTemplates';
import type { AnimeSlideData } from '@/shared/socialTemplates';
import type { PostType, SlideFormat } from '@/shared/socialBot';

interface Props {
    type: PostType;
    data: AnimeSlideData | AnimeSlideData[];
    slideIndex: number;
    format?: SlideFormat;
    /** Width in px of the preview box. Height is derived from the format ratio. */
    width?: number;
}

const NATIVE_W = 1080;
const NATIVE_H_FEED = 1350;
const NATIVE_H_STORY = 1920;

export function SlideHtmlPreview({ type, data, slideIndex, format = 'feed', width = 260 }: Props) {
    const slides = useMemo(() => buildSlidesHTML(type, data), [type, data]);
    const slide = slides[slideIndex] ?? slides[0];

    if (!slide) {
        return (
            <div style={{
                width, height: format === 'story' ? width * (NATIVE_H_STORY / NATIVE_W) : width * (NATIVE_H_FEED / NATIVE_W),
                border: '3px solid #000', background: '#000', color: '#666',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Outfit", sans-serif', fontSize: '0.7rem', textAlign: 'center', padding: '1rem',
            }}>
                Aucune slide à afficher
            </div>
        );
    }

    const nativeH = format === 'story' ? NATIVE_H_STORY : NATIVE_H_FEED;
    const scale = width / NATIVE_W;
    const displayH = nativeH * scale;

    return (
        <div style={{
            width, height: displayH,
            border: '3px solid #000', boxShadow: '5px 5px 0 #000',
            background: '#000', position: 'relative', overflow: 'hidden',
        }}>
            <iframe
                title={`slide-${slideIndex}`}
                srcDoc={slide.html}
                sandbox="allow-same-origin"
                referrerPolicy="no-referrer"
                style={{
                    position: 'absolute', top: 0, left: 0,
                    width: `${NATIVE_W}px`, height: `${nativeH}px`,
                    border: 'none',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
}

export default SlideHtmlPreview;
