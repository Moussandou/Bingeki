/**
 * Bot/crawler UA detection for SSR and prerender handling
 */
export const isBot = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  const ua = navigator.userAgent.toLowerCase();
  const bots = [
    'googlebot',
    'bingbot',
    'yandexbot',
    'duckduckbot',
    'slurp',
    'baiduspider',
    'facebookexternalhit',
    'twitterbot',
    'rogerbot',
    'linkedinbot',
    'embedly',
    'quora link preview',
    'showyoubot',
    'outbrain',
    'pinterest/0.',
    'developers.google.com/+/web/snippet',
    'slackbot',
    'vkshare',
    'w3c_validator',
    'redditbot',
    'applebot',
    'whatsapp',
    'flipboard',
    'tumblr',
    'bitlybot',
    'skypeuripreview',
    'nuzzel',
    'discordbot',
    'google page speed',
    'qwantify',
    'pinterestbot',
    'bitrix link preview',
    'xing-content-proxy',
    'chrome-lighthouse',
    'telegrambot',
    'ia_archiver',
    'headlesschrome',
    'puppeteer',
    'lighthouse',
    'pingdom',
    'gtmetrix',
    'adidxbot',
    'uptimerobot',
    'pageranger',
    'screener',
    'screenshot',
    'microlink'
  ];

  return bots.some(bot => ua.includes(bot));
};
