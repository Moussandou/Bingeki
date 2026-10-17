export interface RenderedPage {
    text: string;
    heading: boolean;
    lang: string;
    title: string;
}

export function assertRenderedPage(page: RenderedPage, lang: string, wrongLanguageTitle: string | undefined, errors: string[]) {
    if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
    if (!page.heading || page.text.length < 40 || /^(chargement|loading)[.!\s]*$/i.test(page.text)) {
        throw new Error('Empty or loading-only React content');
    }
    if (page.lang !== lang) throw new Error(`Expected HTML language ${lang}, received ${page.lang}`);
    if (!page.title.trim() || page.title === wrongLanguageTitle) {
        throw new Error(`Missing or wrong-language title "${page.title}"`);
    }
}
