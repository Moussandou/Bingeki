/**
 * generators/gemini.js — prompt Gemini pour générer captions + hashtags
 * par type de post. Reprend des angles inspirés du bot Python de Yanis
 * (build-in-public, communauté, tech) mais adapté aux 4 types.
 *
 * Phase 1 stub.
 */

// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const { defineSecret } = require('firebase-functions/params');
// const GEMINI_KEY = defineSecret('GEMINI_API_KEY');

const PROMPTS = {
    daily: `Rédige une caption Instagram courte (max 300 chars) pour un post "Sorties du jour" listant les épisodes d'anime sortis aujourd'hui. Ton: enthousiaste, communautaire, adresse les fans avec "vous". Termine par une question ouverte pour l'engagement. Pas de "Chez Bingeki". Renvoie strictement JSON: {"caption": "...", "hashtags": "#... #..."}.`,
    weekly: `Rédige une caption Instagram (max 400 chars) pour un post "Récap hebdo TOP 3" avec le classement des animes les mieux notés par les users Bingeki cette semaine. Ton: fier de la communauté, mets en avant que ce sont EUX qui ont fait le classement. Renvoie strictement JSON: {"caption": "...", "hashtags": "..."}.`,
    favorite: `Rédige une caption Instagram (max 350 chars) pour un post "Coup de cœur communauté" annonçant le/les anime(s) le mieux noté cette semaine. Ton: célébration, invite à découvrir. Renvoie strictement JSON: {"caption": "...", "hashtags": "..."}.`,
    newseason: `Rédige une caption Instagram (max 400 chars) pour un post d'annonce "Nouvelle saison qui démarre". Ton: hype, événementiel. Mentionne le studio et la note de la saison précédente. Renvoie strictement JSON: {"caption": "...", "hashtags": "..."}.`,
};

async function generateCaption(_type, _data, _config) {
    // TODO: build prompt with data, call gemini, parse JSON, return {caption, hashtags}.
    throw new Error('Not implemented — Phase 2');
}

module.exports = { generateCaption, PROMPTS };
