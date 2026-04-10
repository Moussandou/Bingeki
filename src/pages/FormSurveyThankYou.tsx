/**
 * Form Survey Thank You page
 */
import { motion } from 'framer-motion';
import { PartyPopper, Home, UserPlus } from 'lucide-react';
import { DiscordIcon, TikTokIcon, InstagramIcon } from '@/components/ui/BrandIcons';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/layout/SEO';
import { useLocalizedNavigate } from '@/components/routing/LocalizedLink';

import styles from './FormSurveyThankYou.module.css';

export default function FormSurveyThankYou() {
  const { t, i18n } = useTranslation();
  const { language: lang } = i18n;
  const navigate = useLocalizedNavigate();

  return (
    <Layout>
      <div className={styles.container}>
        <SEO title={t('survey.thank_you.title')} />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`${styles.thankYouPanel} manga-panel`}
        >
          <div className={styles.iconWrapper}>
            <PartyPopper size={64} className={styles.icon} />
          </div>
          
          <h1 className={styles.title}>{t('survey.thank_you.title')}</h1>
          <p className={styles.message}>
            {t('survey.thank_you.message')}
          </p>
          
          <div className={styles.accentDivider} />
          
          <div className={styles.ctaSection}>
            <p className={styles.ctaText}>{t('survey.thank_you.next_steps')}</p>
            
            <div className={styles.buttonGrid}>
              <Button 
                variant="manga" 
                size="lg"
                className={styles.primaryBtn}
                onClick={() => navigate(`/${lang || 'fr'}/register`)}
              >
                <UserPlus size={20} /> {t('survey.thank_you.join_site')}
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => window.open("https://discord.gg/gjkBRjsbWx", "_blank")}
              >
                <DiscordIcon size={20} /> {t('survey.thank_you.discord')}
              </Button>

              <Button 
                variant="outline" 
                size="lg"
                onClick={() => window.open("https://www.instagram.com/bingeki.fr", "_blank")}
              >
                <InstagramIcon size={20} /> {t('survey.thank_you.instagram')}
              </Button>

              <Button 
                variant="outline" 
                size="lg"
                onClick={() => window.open("https://www.tiktok.com/@bingeki", "_blank")}
              >
                <TikTokIcon size={20} /> {t('survey.thank_you.tiktok')}
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => navigate(`/${lang || 'fr'}`)}
              >
                <Home size={20} /> {t('survey.thank_you.home')}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
