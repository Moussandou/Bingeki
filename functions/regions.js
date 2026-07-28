/**
 * Migration us-central1 → europe-west9 (co-localisation avec Firestore).
 *
 * Les callables et seoHandler sont servis depuis les DEUX régions le temps que les
 * clients encore chargés avec l'ancien bundle basculent. Sans ça, supprimer
 * us-central1 avant le déploiement du hosting couperait le site (le rewrite `**`
 * pointe sur seoHandler).
 *
 * Fin de migration : réduire à ["europe-west9"] et redéployer (voir le runbook).
 *
 * Volontairement NON appliqué aux triggers Firestore et aux tâches planifiées :
 * deux instances actives = double exécution (double XP, crons en doublon).
 */
const CALLABLE_REGIONS = ["us-central1", "europe-west9"];

module.exports = { CALLABLE_REGIONS };
