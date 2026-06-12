import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { ContentList } from '@/components/library/ContentList';
import type { Work } from '@/store/libraryStore';
import type { JikanEpisode, JikanStreaming } from '@/services/animeApi';

interface EpisodesSectionProps {
    work: Work;
    episodes: JikanEpisode[];
    handleEpisodeSelect: (number: number) => void;
    handleExpandEpisode: (number: number) => void;
    isLoadingEpisodes: boolean;
    episodesPage: number;
    hasMoreEpisodes: boolean;
    streaming: JikanStreaming[];
    setEpisodesPage: (page: number | ((p: number) => number)) => void;
    libraryWork: Work | undefined;
    totalEpisodesPage: number;
    updateWorkDetails: (id: string | number, details: Partial<Work>) => void;
}

export function EpisodesSection({
    work,
    episodes,
    handleEpisodeSelect,
    handleExpandEpisode,
    isLoadingEpisodes,
    episodesPage,
    hasMoreEpisodes,
    streaming,
    setEpisodesPage,
    libraryWork,
    totalEpisodesPage,
    updateWorkDetails
}: EpisodesSectionProps) {
    const { t } = useTranslation();

    if (work.type === 'manga' && (!work.totalChapters || work.totalChapters === 0)) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed var(--color-border-heavy)' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>{t('work_details.chapters.unknown_count')}</h3>
                <p style={{ marginBottom: '1rem' }}>{t('work_details.chapters.unknown_desc')}</p>
                <Button
                    onClick={() => {
                        const newTotal = prompt(t('work_details.chapters.prompt'), "0");
                        if (newTotal && !isNaN(Number(newTotal))) {
                            updateWorkDetails(work.id, { totalChapters: Number(newTotal) });
                        }
                    }}
                    variant="manga"
                >
                    {t('work_details.chapters.set_count')}
                </Button>
            </div>
        );
    }

    return (
        <ContentList
            items={episodes}
            currentProgress={work.currentChapter || 0}
            onSelect={handleEpisodeSelect}
            onExpand={handleExpandEpisode}
            isLoading={isLoadingEpisodes}
            page={episodesPage}
            hasNextPage={hasMoreEpisodes}
            streamingServices={streaming}
            hasPrevPage={episodesPage > 1}
            onNextPage={() => setEpisodesPage((p: number) => p + 1)}
            onPrevPage={() => setEpisodesPage((p: number) => p - 1)}
            workTitle={work.title}
            workType={work.type === 'manga' ? 'manga' : 'anime'}
            workId={work.id}
            readOnly={!libraryWork}
            lastPage={work.type === 'manga' ? Math.ceil((work.totalChapters || 100) / 50) : totalEpisodesPage}
            onFirstPage={() => setEpisodesPage(1)}
        />
    );
}
