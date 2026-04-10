/**
 * Form Survey page
 */
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Globe } from 'lucide-react';
import { InstagramIcon } from '@/components/ui/BrandIcons';
import { db, analytics } from '@/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/layout/SEO';
import { useLocalizedNavigate } from '@/components/routing/LocalizedLink';
import styles from './FormSurvey.module.css';

interface FormData {
  ageRange: string;
  status: string;
  consumptionFrequency: string;
  animeCount: string;
  readsManga: string;
  platforms: string[];
  devices: string[];
  forgetsProgress: string;
  currentTrackingMethod: string;
  frustrations: string;
  interestLevel: string;
  mostAttractiveFeatures: string[];
  likesGamification: string;
  motivationDrivers: string[];
  premiumInterest: string;
  premiumFeatures: string[];
  acceptablePrice: string;
  sharesWithFriends: string;
  socialPlatforms: string[];
  socialFeaturesInterest: string;
  mustHaveFeature: string;
  dailyReturnReason: string;
  wantsLaunchNews: string;
  email: string;
  referralSource: string;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
  }),
};

// Sub-components moved outside to prevent remounts and "flash" issues
const RadioOption = ({ 
  name, 
  value, 
  label, 
  questionIndex, 
  watch, 
  setValue, 
  visibleQuestions, 
  setVisibleQuestions 
}: { 
  name: keyof FormData, 
  value: string, 
  label: string, 
  questionIndex?: number,
  watch: any,
  setValue: any,
  visibleQuestions: number,
  setVisibleQuestions: (val: number | ((prev: number) => number)) => void
}) => {
  const currentValue = watch(name);
  const isSelected = currentValue === value;
  
  const handleSelect = () => {
    setValue(name, value);
    if (questionIndex !== undefined && questionIndex === visibleQuestions) {
      setVisibleQuestions(prev => prev + 1);
    }
  };

  return (
    <div 
      role="button"
      onClick={handleSelect}
      className={`${styles.optionCard} ${isSelected ? styles.selected : ''}`}
    >
      <span className={styles.optionLabel}>{label}</span>
    </div>
  );
};

const CheckboxOption = ({ 
  name, 
  value, 
  label, 
  watch, 
  setValue 
}: { 
  name: keyof FormData, 
  value: string, 
  label: string,
  watch: any,
  setValue: any
}) => {
  const currentValues = watch(name) as string[] || [];
  const isSelected = currentValues.includes(value);

  const toggle = () => {
    if (isSelected) {
      setValue(name, currentValues.filter((v: string) => v !== value));
    } else {
      setValue(name, [...currentValues, value]);
    }
  };
  return (
    <div 
      role="button"
      onClick={toggle}
      className={`${styles.optionCard} ${isSelected ? styles.selected : ''}`}
    >
      <div className={styles.checkboxIndicator}>
        {isSelected && <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className={styles.optionLabel}>{label}</span>
    </div>
  );
};

const QuestionContainer = ({ children, isVisible }: { children: React.ReactNode, isVisible: boolean }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className={styles.questionSection}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function FormSurvey() {
  const { t, i18n } = useTranslation();
  const { language: lang } = i18n;
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleQuestions, setVisibleQuestions] = useState<number>(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const localizedNavigate = useLocalizedNavigate();
  const { pathname } = useLocation();

  const toggleLanguage = () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    const segments = pathname.split('/');
    // Form is at /fr/form or /en/form. segments[1] is the language.
    if (segments[1] === 'fr' || segments[1] === 'en') {
      segments[1] = newLang;
      localizedNavigate(segments.join('/'));
    } else {
      // Fallback if no lang segment
      localizedNavigate(`/${newLang}/form`);
    }
  };

  const steps = [
    { id: 'landing', title: t('survey.landing.title'), description: t('survey.landing.desc') },
    { id: 'profil', title: t('survey.steps.profil.title'), description: t('survey.steps.profil.desc') },
    { id: 'habitudes', title: t('survey.steps.habitudes.title'), description: t('survey.steps.habitudes.desc') },
    { id: 'problemes', title: t('survey.steps.problemes.title'), description: t('survey.steps.problemes.desc') },
    { id: 'interet', title: t('survey.steps.interet.title'), description: t('survey.steps.interet.desc') },
    { id: 'gamification', title: t('survey.steps.gamification.title'), description: t('survey.steps.gamification.desc') },
    { id: 'monetisation', title: t('survey.steps.monetisation.title'), description: t('survey.steps.monetisation.desc') },
    { id: 'communaute', title: t('survey.steps.communaute.title'), description: t('survey.steps.communaute.desc') },
    { id: 'libre', title: t('survey.steps.libre.title'), description: t('survey.steps.libre.desc') },
    { id: 'lead', title: t('survey.steps.lead.title'), description: t('survey.steps.lead.desc') }
  ];

  const { handleSubmit, watch, setValue, register } = useForm<FormData>({
    defaultValues: {
      platforms: [],
      devices: [],
      mostAttractiveFeatures: [],
      motivationDrivers: [],
      premiumFeatures: [],
      socialPlatforms: [],
      frustrations: '',
      mustHaveFeature: '',
      dailyReturnReason: '',
      email: '',
      wantsLaunchNews: 'Non'
    }
  });

  // Handle auto-scroll logic in a useEffect to ensure DOM is updated
  useEffect(() => {
    if (visibleQuestions > 1) {
      setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [visibleQuestions]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      if (currentStep === 0) {
        logEvent(analytics, 'survey_start');
      } else {
        logEvent(analytics, 'survey_step_completed', { step: steps[currentStep].id });
      }
      setDirection(1);
      setCurrentStep((prev: number) => prev + 1);
      setVisibleQuestions(1); 
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev: number) => prev - 1);
      setVisibleQuestions(20); // Show all when going back
      window.scrollTo(0, 0);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      
      const sanitizedAnswers = Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = value === undefined ? '' : value;
        return acc;
      }, {} as any);

      const docData = {
        surveyId: 'main-survey',
        answers: sanitizedAnswers,
        submittedAt: Date.now(),
        userAgent: window.navigator.userAgent,
        language: lang || 'fr'
      };
      
      await addDoc(collection(db, 'survey_responses'), docData);

      if (data.email && data.wantsLaunchNews === 'Oui') {
        await addDoc(collection(db, 'survey_waitlist'), {
          email: data.email,
          source: 'survey',
          createdAt: serverTimestamp(),
        });
      }

      logEvent(analytics, 'survey_completed');
      localizedNavigate(`/${lang || 'fr'}/form/thank-you`);
    } catch (error) {
      console.error('Erreur lors de l\'envoi :', error);
      alert(t('survey.errors.submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className={styles.container} ref={scrollRef}>
        <SEO title={t('survey.title')} />
        <div className={styles.header}>
          <div className={styles.brand}>{t('survey.brand')}<span>.</span></div>
          
          <div className={styles.headerActions}>
            <button 
              type="button"
              className={styles.languageToggle}
              onClick={toggleLanguage}
              title={lang === 'fr' ? 'English' : 'Français'}
            >
              <Globe size={18} />
              <span>{lang === 'fr' ? 'EN' : 'FR'}</span>
            </button>
            
            {currentStep > 0 && currentStep < steps.length - 1 && (
              <div className={styles.stepIndicator}>
                {t('survey.step_indicator', { current: currentStep, total: steps.length - 2 })}
              </div>
            )}
          </div>
        </div>

      {currentStep > 0 && currentStep < steps.length - 1 && (
        <div className={styles.progressContainer}>
          <motion.div 
            className={styles.progressBar}
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / (steps.length - 2)) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      <div className={styles.mainContent}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            style={{ width: '100%' }}
          >
            <div className={`${styles.formPanel} manga-panel`}>
            {currentStep === 0 && (
              <div className={styles.landing}>
                <h1 className={styles.landingTitle} dangerouslySetInnerHTML={{ __html: t('survey.landing.title') }} />
                <p className={styles.landingDesc}>
                  {t('survey.landing.desc')}
                </p>
                <Button variant="manga" onClick={nextStep} className={styles.btnPrimary} size="lg">
                  {t('survey.footer.start')} <ArrowRight size={24} />
                </Button>
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <h2 className={styles.stepTitle}>{t('survey.steps.profil.title')}</h2>
                <p className={styles.stepDesc}>{t('survey.steps.profil.desc')}</p>

                <div className={styles.questionsGroup}>
                  <QuestionContainer isVisible={visibleQuestions >= 1}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.age')}</h3>
                    <div className={styles.optionsGrid}>
                      <RadioOption name="ageRange" value="-15" label="- de 15 ans" questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                      <RadioOption name="ageRange" value="15-18" label="15-18 ans" questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                      <RadioOption name="ageRange" value="19-24" label="19-24 ans" questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                      <RadioOption name="ageRange" value="25-30" label="25-30 ans" questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                      <RadioOption name="ageRange" value="30+" label="+ de 30 ans" questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    </div>
                  </QuestionContainer>

                  <QuestionContainer isVisible={visibleQuestions >= 2}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.status')}</h3>
                    <RadioOption name="status" value="etudiant" label={t('survey.options.status.etudiant')} questionIndex={2} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="status" value="salarie" label={t('survey.options.status.salarie')} questionIndex={2} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="status" value="autre" label={t('survey.options.status.autre')} questionIndex={2} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                  </QuestionContainer>

                  <QuestionContainer isVisible={visibleQuestions >= 3}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.referral_source')}</h3>
                    <div className={styles.optionsGrid}>
                      <RadioOption name="referralSource" value="tiktok" label={t('survey.options.referral.tiktok')} questionIndex={3} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                      <RadioOption name="referralSource" value="instagram" label={t('survey.options.referral.instagram')} questionIndex={3} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                      <RadioOption name="referralSource" value="discord" label={t('survey.options.referral.discord')} questionIndex={3} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                      <RadioOption name="referralSource" value="bouche_a_oreille" label={t('survey.options.referral.word_of_mouth')} questionIndex={3} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                      <RadioOption name="referralSource" value="recherche" label={t('survey.options.referral.search')} questionIndex={3} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                      <RadioOption name="referralSource" value="autre" label={t('survey.options.referral.other')} questionIndex={3} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    </div>
                  </QuestionContainer>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h2 className={styles.stepTitle}>{t('survey.steps.habitudes.title')}</h2>
                <p className={styles.stepDesc}>{t('survey.steps.habitudes.desc')}</p>

                <div className={styles.questionsGroup}>
                  <QuestionContainer isVisible={visibleQuestions >= 1}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.consumption_frequency')}</h3>
                    <RadioOption name="consumptionFrequency" value="quotidien" label={t('survey.options.frequency.quotidien')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="consumptionFrequency" value="hebdomadaire" label={t('survey.options.frequency.hebdomadaire')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="consumptionFrequency" value="mensuel" label={t('survey.options.frequency.mensuel')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                  </QuestionContainer>

                  <QuestionContainer isVisible={visibleQuestions >= 2}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.anime_count')}</h3>
                    <RadioOption name="animeCount" value="1-2" label="1 à 2" questionIndex={2} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="animeCount" value="3-5" label="3 à 5" questionIndex={2} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="animeCount" value="5+" label="Plus de 5" questionIndex={2} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                  </QuestionContainer>

                  <QuestionContainer isVisible={visibleQuestions >= 3}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.reads_manga')}</h3>
                    <RadioOption name="readsManga" value="oui_beaucoup" label={t('survey.options.manga.oui_beaucoup')} questionIndex={3} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="readsManga" value="oui_un_peu" label={t('survey.options.manga.oui_un_peu')} questionIndex={3} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="readsManga" value="non" label={t('survey.options.manga.non')} questionIndex={3} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                  </QuestionContainer>
                  
                  <QuestionContainer isVisible={visibleQuestions >= 4}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.devices')}</h3>
                    <CheckboxOption name="devices" value="smartphone" label={t('survey.options.devices.smartphone')} watch={watch} setValue={setValue} />
                    <CheckboxOption name="devices" value="pc" label={t('survey.options.devices.pc')} watch={watch} setValue={setValue} />
                    <CheckboxOption name="devices" value="tv" label={t('survey.options.devices.tv')} watch={watch} setValue={setValue} />
                    <CheckboxOption name="devices" value="tablette" label={t('survey.options.devices.tablette')} watch={watch} setValue={setValue} />
                  </QuestionContainer>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h2 className={styles.stepTitle}>{t('survey.steps.problemes.title')}</h2>
                <p className={styles.stepDesc}>{t('survey.steps.problemes.desc')}</p>

                <div className={styles.questionsGroup}>
                  <QuestionContainer isVisible={visibleQuestions >= 1}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.forgets_progress')}</h3>
                    <RadioOption name="forgetsProgress" value="souvent" label={t('survey.options.forget.souvent')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="forgetsProgress" value="parfois" label={t('survey.options.forget.parfois')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="forgetsProgress" value="jamais" label={t('survey.options.forget.jamais')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                  </QuestionContainer>

                  <QuestionContainer isVisible={visibleQuestions >= 2}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.current_tracking')}</h3>
                    <RadioOption name="currentTrackingMethod" value="myanimelist" label={t('survey.options.tracking.myanimelist')} questionIndex={2} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="currentTrackingMethod" value="notes" label={t('survey.options.tracking.notes')} questionIndex={2} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="currentTrackingMethod" value="memoire" label={t('survey.options.tracking.memoire')} questionIndex={2} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="currentTrackingMethod" value="autre" label={t('survey.options.tracking.autre')} questionIndex={2} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                  </QuestionContainer>

                  <QuestionContainer isVisible={visibleQuestions >= 3}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.frustrations')}</h3>
                    <textarea 
                      {...register("frustrations")}
                      placeholder={t('survey.placeholders.frustrations')}
                      className={styles.textarea}
                    ></textarea>
                  </QuestionContainer>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <h2 className={styles.stepTitle}>{t('survey.steps.interet.title')}</h2>
                <p className={styles.stepDesc}>{t('survey.steps.interet.desc')}</p>

                <div className={styles.questionsGroup}>
                  <QuestionContainer isVisible={visibleQuestions >= 1}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.interest_level')}</h3>
                    <RadioOption name="interestLevel" value="beaucoup" label={t('survey.options.interest.beaucoup')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="interestLevel" value="un_peu" label={t('survey.options.interest.un_peu')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="interestLevel" value="pas_du_tout" label={t('survey.options.interest.pas_du_tout')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                  </QuestionContainer>

                  <QuestionContainer isVisible={visibleQuestions >= 2}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.attractive_features')}</h3>
                    <CheckboxOption name="mostAttractiveFeatures" value="design" label={t('survey.options.features.design')} watch={watch} setValue={setValue} />
                    <CheckboxOption name="mostAttractiveFeatures" value="gamification" label={t('survey.options.features.gamification')} watch={watch} setValue={setValue} />
                    <CheckboxOption name="mostAttractiveFeatures" value="social" label={t('survey.options.features.social')} watch={watch} setValue={setValue} />
                    <CheckboxOption name="mostAttractiveFeatures" value="statistiques" label={t('survey.options.features.statistiques')} watch={watch} setValue={setValue} />
                  </QuestionContainer>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div>
                <h2 className={styles.stepTitle}>{t('survey.steps.gamification.title')}</h2>
                <p className={styles.stepDesc}>{t('survey.steps.gamification.desc')}</p>

                <div className={styles.questionsGroup}>
                  <QuestionContainer isVisible={visibleQuestions >= 1}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.likes_gamification')}</h3>
                    <RadioOption name="likesGamification" value="oui_beaucoup" label={t('survey.options.gamification.like_much')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="likesGamification" value="oui_un_peu" label={t('survey.options.gamification.like_some')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="likesGamification" value="non" label={t('survey.options.gamification.no_interest')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                  </QuestionContainer>

                  <QuestionContainer isVisible={visibleQuestions >= 2}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.motivation_drivers')}</h3>
                    <CheckboxOption name="motivationDrivers" value="badges" label={t('survey.options.motivation.badges')} watch={watch} setValue={setValue} />
                    <CheckboxOption name="motivationDrivers" value="niveau" label={t('survey.options.motivation.niveau')} watch={watch} setValue={setValue} />
                    <CheckboxOption name="motivationDrivers" value="classement" label={t('survey.options.motivation.classement')} watch={watch} setValue={setValue} />
                    <CheckboxOption name="motivationDrivers" value="defis" label={t('survey.options.motivation.defis')} watch={watch} setValue={setValue} />
                  </QuestionContainer>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div>
                <h2 className={styles.stepTitle}>{t('survey.steps.monetisation.title')}</h2>
                <p className={styles.stepDesc}>{t('survey.steps.monetisation.desc')}</p>

                <div className={styles.questionsGroup}>
                  <QuestionContainer isVisible={visibleQuestions >= 1}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.premium_interest')}</h3>
                    <RadioOption name="premiumInterest" value="oui" label={t('survey.options.premium.oui')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="premiumInterest" value="peut_etre" label={t('survey.options.premium.peut_etre')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="premiumInterest" value="non" label={t('survey.options.premium.non')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                  </QuestionContainer>

                  {(watch('premiumInterest') === 'oui' || watch('premiumInterest') === 'peut_etre') && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.questionsGroup}>
                      <div>
                        <h3 className={styles.questionTitle}>{t('survey.questions.premium_features')}</h3>
                        <CheckboxOption name="premiumFeatures" value="personnalisation" label={t('survey.options.premium_features.personnalisation')} watch={watch} setValue={setValue} />
                        <CheckboxOption name="premiumFeatures" value="badges_exclusifs" label={t('survey.options.premium_features.badges_exclusifs')} watch={watch} setValue={setValue} />
                        <CheckboxOption name="premiumFeatures" value="stats_avancees" label={t('survey.options.premium_features.stats_avancees')} watch={watch} setValue={setValue} />
                        <CheckboxOption name="premiumFeatures" value="soutien" label={t('survey.options.premium_features.soutien')} watch={watch} setValue={setValue} />
                      </div>
                      <QuestionContainer isVisible={visibleQuestions >= 2}>
                        <h3 className={styles.questionTitle}>{t('survey.questions.acceptable_price')}</h3>
                        <RadioOption name="acceptablePrice" value="1-2" label="1€ - 2€ / mois" questionIndex={2} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                        <RadioOption name="acceptablePrice" value="3-5" label="3€ - 5€ / mois" questionIndex={2} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                        <RadioOption name="acceptablePrice" value="5+" label="Plus de 5€ / mois" questionIndex={2} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                      </QuestionContainer>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 7 && (
              <div>
                <h2 className={styles.stepTitle}>{t('survey.steps.communaute.title')}</h2>
                <p className={styles.stepDesc}>{t('survey.steps.communaute.desc')}</p>

                <div className={styles.questionsGroup}>
                  <QuestionContainer isVisible={visibleQuestions >= 1}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.shares_friends')}</h3>
                    <RadioOption name="sharesWithFriends" value="souvent" label={t('survey.options.social.often')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="sharesWithFriends" value="parfois" label={t('survey.options.social.sometimes')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="sharesWithFriends" value="jamais" label={t('survey.options.social.solo')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                  </QuestionContainer>

                  <QuestionContainer isVisible={visibleQuestions >= 2}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.social_platforms')}</h3>
                    <CheckboxOption name="socialPlatforms" value="twitter" label="🐦 Twitter / X" watch={watch} setValue={setValue} />
                    <CheckboxOption name="socialPlatforms" value="discord" label="👾 Discord" watch={watch} setValue={setValue} />
                    <CheckboxOption name="socialPlatforms" value="tiktok" label="📱 TikTok" watch={watch} setValue={setValue} />
                    <CheckboxOption name="socialPlatforms" value="reddit" label="🤖 Reddit" watch={watch} setValue={setValue} />
                  </QuestionContainer>

                  <QuestionContainer isVisible={visibleQuestions >= 3}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.social_interest')}</h3>
                    <RadioOption name="socialFeaturesInterest" value="oui_beaucoup" label={t('survey.options.social_interest.feed')} questionIndex={3} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="socialFeaturesInterest" value="oui_un_peu" label={t('survey.options.social_interest.maybe')} questionIndex={3} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    <RadioOption name="socialFeaturesInterest" value="non" label={t('survey.options.social_interest.no')} questionIndex={3} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                  </QuestionContainer>
                </div>
              </div>
            )}

            {currentStep === 8 && (
              <div>
                <h2 className={styles.stepTitle}>{t('survey.steps.libre.title')}</h2>
                <p className={styles.stepDesc}>{t('survey.steps.libre.desc')}</p>

                <div className={styles.questionsGroup}>
                  <QuestionContainer isVisible={visibleQuestions >= 1}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.must_have')}</h3>
                    <textarea 
                      {...register("mustHaveFeature")}
                      placeholder={t('survey.placeholders.frustrations')}
                      className={styles.textarea}
                    ></textarea>
                  </QuestionContainer>

                  <QuestionContainer isVisible={visibleQuestions >= 2}>
                    <h3 className={styles.questionTitle}>{t('survey.questions.daily_return')}</h3>
                    <textarea 
                      {...register("dailyReturnReason")}
                      placeholder={t('survey.placeholders.daily_return')}
                      className={styles.textarea}
                    ></textarea>
                  </QuestionContainer>
                </div>
              </div>
            )}

            {currentStep === 9 && (
              <div>
                <h2 className={styles.stepTitle}>{t('survey.steps.lead.title')}</h2>
                <p className={styles.stepDesc}>{t('survey.steps.lead.desc')}</p>

                <div className={styles.questionsGroup}>
                  <div className={styles.leadBox}>
                    <h3 className={styles.leadTitle}>{t('survey.questions.stay_in_touch')}</h3>
                    <p className={styles.leadDesc}>{t('survey.questions.stay_in_touch_desc')}</p>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                      <RadioOption name="wantsLaunchNews" value="Oui" label={t('survey.questions.wants_news')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                      <RadioOption name="wantsLaunchNews" value="Non" label={t('survey.questions.no_news')} questionIndex={1} watch={watch} setValue={setValue} visibleQuestions={visibleQuestions} setVisibleQuestions={setVisibleQuestions} />
                    </div>

                    {watch('wantsLaunchNews') === 'Oui' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <input 
                          type="email" 
                          {...register("email")}
                          placeholder={t('survey.placeholders.email')}
                          className={styles.inputField}
                        />
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className={styles.joinSection}>
                  <div className={styles.joinDivider} />
                  <h3 className={styles.joinTitle}>{t('survey.footer.join_title')}</h3>
                  <div className={styles.joinActions}>
                    <Button 
                      type="button" 
                      className={styles.joinBtn}
                      onClick={() => localizedNavigate('/auth')}
                    >
                      {t('survey.footer.join_button')}
                    </Button>
                    <a 
                      href="https://www.instagram.com/bingeki.fr" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.instaLink}
                    >
                      <InstagramIcon size={20} />
                      <span>{t('survey.footer.follow_insta')}</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {currentStep > 0 && (
        <div className={styles.footer}>
          <Button 
            variant="manga"
            onClick={prevStep}
            disabled={isSubmitting}
            className={styles.btnSecondary}
          >
            <ArrowLeft size={20} /> {t('survey.footer.back')}
          </Button>
          
          <div className={styles.footerRight}>
            {currentStep < steps.length - 1 ? (
              <Button 
                variant="manga"
                onClick={nextStep}
                className={styles.btnPrimary}
              >
                {t('survey.footer.next')} <ArrowRight size={20} />
              </Button>
            ) : (
              <Button 
                variant="manga"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className={styles.btnPrimary}
              >
                {isSubmitting ? (
                  <>
                    <div className={styles.loadingSpinner}>
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    {t('survey.footer.submitting')}
                  </>
                ) : (
                  <>{t('survey.footer.finish')} <ArrowRight size={20} /></>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}
