import { db, auth, storage } from '@/firebase/config';
import { collection, getDocs, doc, getDoc, limit, query, orderBy, where, addDoc, serverTimestamp, type QuerySnapshot, type DocumentData, updateDoc } from 'firebase/firestore';
import { ref, list } from 'firebase/storage';
import { checkJikanStatus, type JikanStatusResponse } from '@/services/animeApi';
import { getGlobalConfig } from '@/firebase/firestore';
import { jikanQueue } from '@/utils/apiQueue';
import { logger } from '@/utils/logger';

// ─── Types ───────────────────────────────────────────────────────────
export type ServiceStatus = 'operational' | 'degraded' | 'down' | 'checking';

export interface ServiceHealthResult {
    service: string;
    status: ServiceStatus;
    responseTime: number; // ms
    message?: string;
    checkedAt: number;
}

export interface DataIntegrityReport {
    totalUsers: number;
    missingDisplayName: number;
    missingPhotoURL: number;
    dataHealthScore: number; // 0-100
    checkedAt: number;
}

export interface GamificationHealthStats {
    totalUsers: number;
    avgLevel: number;
    maxLevelUsers: number;
    usersWithBadges: number;
    badgeUnlockRate: number; // 0-100
    avgXP: number;
    checkedAt: number;
}

export interface SecurityOverview {
    bannedUsersCount: number;
    maintenanceMode: boolean;
    registrationsOpen: boolean;
    checkedAt: number;
}

export interface CommunityContentStats {
    totalComments: number;
    totalTierLists: number;
    publicTierLists: number;
    activeWatchParties: number;
    totalWatchParties: number;
    checkedAt: number;
}

export interface ApiQueueStats {
    pending: number;
    processing: boolean;
    error?: string;
    checkedAt: number;
}

export interface EditorialStats {
    totalNews: number;
    lastPublished: string | null; // ISO date
    lastTitle: string | null;
    checkedAt: number;
}

export interface ChallengeStats {
    totalChallenges: number;
    activeChallenges: number;
    completedChallenges: number;
    checkedAt: number;
}

export interface SurveyStats {
    totalResponses: number;
    totalWaitlist: number;
    checkedAt: number;
}

export interface FullHealthReport {
    infrastructure: ServiceHealthResult[];
    jikan: JikanStatusResponse | null;
    dataIntegrity: DataIntegrityReport;
    gamification: GamificationHealthStats;
    security: SecurityOverview;
    community: CommunityContentStats;
    apiQueue: ApiQueueStats;
    editorial: EditorialStats;
    challenges: ChallengeStats;
    survey: SurveyStats;
    overallScore: number; // 0-100
    checkedAt: number;
}

export interface RepairAction {
    uid: string;
    userName: string;
    changes: string[];
}

export interface RepairSession {
    id?: string;
    timestamp: any;
    adminName: string;
    repairedCount: number;
    errorsCount: number;
    actions: RepairAction[];
}

// ─── Infrastructure Checks ──────────────────────────────────────────

/** Check Firebase Auth connectivity */
export async function checkFirebaseAuth(): Promise<ServiceHealthResult> {
    const start = performance.now();
    try {
        const _user = auth.currentUser;
        const elapsed = Math.round(performance.now() - start);
        return {
            service: 'Firebase Auth',
            status: 'operational',
            responseTime: elapsed,
            message: _user ? 'Authenticated' : 'Service reachable',
            checkedAt: Date.now()
        };
    } catch (error) {
        const elapsed = Math.round(performance.now() - start);
        logger.error('[HealthCheck] Auth check failed:', error);
        return {
            service: 'Firebase Auth',
            status: 'down',
            responseTime: elapsed,
            message: error instanceof Error ? error.message : 'Unknown error',
            checkedAt: Date.now()
        };
    }
}

/** Check Firestore connectivity with a lightweight read */
export async function checkFirestore(): Promise<ServiceHealthResult> {
    const start = performance.now();
    try {
        const uid = auth.currentUser?.uid;
        if (!uid) {
            return {
                service: 'Firestore',
                status: 'degraded',
                responseTime: Math.round(performance.now() - start),
                message: 'No authenticated user',
                checkedAt: Date.now()
            };
        }
        const userDoc = await getDoc(doc(db, 'users', uid));
        const elapsed = Math.round(performance.now() - start);
        return {
            service: 'Firestore',
            status: userDoc.exists() ? 'operational' : 'degraded',
            responseTime: elapsed,
            message: userDoc.exists() ? 'Connected' : 'User doc missing',
            checkedAt: Date.now()
        };
    } catch (error) {
        const elapsed = Math.round(performance.now() - start);
        logger.error('[HealthCheck] Firestore check failed:', error);
        return {
            service: 'Firestore',
            status: 'down',
            responseTime: elapsed,
            message: error instanceof Error ? error.message : 'Connection failed',
            checkedAt: Date.now()
        };
    }
}

/** Check Firebase Storage connectivity */
export async function checkStorage(): Promise<ServiceHealthResult> {
    const start = performance.now();
    try {
        const rootRef = ref(storage);
        try {
            // Attempt a listing to check connectivity. 
            // This may fail with 403 if the user is not an admin, which is expected.
            await list(rootRef, { maxResults: 1 });
        } catch (innerError: any) {
            // Handle expected permission errors gracefully
            if (innerError?.code === 'storage/unauthorized' || innerError?.message?.includes('403')) {
                const elapsed = Math.round(performance.now() - start);
                return {
                    service: 'Storage',
                    status: 'operational',
                    responseTime: elapsed,
                    message: 'Connected (Restricted Access)',
                    checkedAt: Date.now()
                };
            }
            throw innerError;
        }
        const elapsed = Math.round(performance.now() - start);
        return {
            service: 'Storage',
            status: 'operational',
            responseTime: elapsed,
            message: 'Connected (Full Access)',
            checkedAt: Date.now()
        };
    } catch (error) {
        const elapsed = Math.round(performance.now() - start);
        logger.error('[HealthCheck] Storage check failed:', error);
        return {
            service: 'Storage',
            status: 'down',
            responseTime: elapsed,
            message: error instanceof Error ? error.message : 'Bucket unreachable',
            checkedAt: Date.now()
        };
    }
}

/** Check Jikan API (external) */
export async function checkJikan(): Promise<ServiceHealthResult> {
    const start = performance.now();
    try {
        const result = await checkJikanStatus();
        const elapsed = Math.round(performance.now() - start);
        return {
            service: 'Jikan API',
            status: result.status === 'online' ? 'operational'
                : result.status === 'offline' ? 'down' : 'degraded',
            responseTime: result.responseTime || elapsed,
            message: `MyAnimeList proxy – ${result.status}`,
            checkedAt: Date.now()
        };
    } catch (error) {
        const elapsed = Math.round(performance.now() - start);
        return {
            service: 'Jikan API',
            status: 'down',
            responseTime: elapsed,
            message: 'API unreachable',
            checkedAt: Date.now()
        };
    }
}

// ─── Data Integrity ─────────────────────────────────────────────────

export async function getDataIntegrityReport(usersSnapshot?: QuerySnapshot<DocumentData>): Promise<DataIntegrityReport> {
    try {
        const snap = usersSnapshot || await getDocs(query(collection(db, 'users'), limit(500)));
        let missingDisplayName = 0;
        let missingPhotoURL = 0;

        snap.docs.forEach(d => {
            const data = d.data();
            if (!data.displayName || data.displayName.trim() === '') missingDisplayName++;
            if (!data.photoURL || data.photoURL.trim() === '') missingPhotoURL++;
        });

        const total = snap.size;
        const issuesCount = missingDisplayName + missingPhotoURL;
        const maxIssues = total * 2;
        const score = maxIssues > 0 ? Math.round(((maxIssues - issuesCount) / maxIssues) * 100) : 100;

        return {
            totalUsers: total,
            missingDisplayName,
            missingPhotoURL,
            dataHealthScore: score,
            checkedAt: Date.now()
        };
    } catch (error) {
        logger.error('[HealthCheck] Data integrity check failed:', error);
        return {
            totalUsers: 0,
            missingDisplayName: 0,
            missingPhotoURL: 0,
            dataHealthScore: 0,
            checkedAt: Date.now()
        };
    }
}

// ─── Gamification Health ────────────────────────────────────────────

export async function getGamificationHealthStats(usersSnapshot?: QuerySnapshot<DocumentData>): Promise<GamificationHealthStats> {
    try {
        const snap = usersSnapshot || await getDocs(query(collection(db, 'users'), limit(500)));
        let totalLevel = 0;
        let totalXP = 0;
        let maxLevelUsers = 0;
        let usersWithBadges = 0;

        snap.docs.forEach(d => {
            const data = d.data();
            const level = data.level || 1;
            const xp = data.xp || 0;
            const badges = data.unlockedBadges || [];

            totalLevel += level;
            totalXP += xp;
            if (level >= 100) maxLevelUsers++;
            if (badges.length > 0) usersWithBadges++;
        });

        const total = snap.size;

        return {
            totalUsers: total,
            avgLevel: total > 0 ? Math.round((totalLevel / total) * 10) / 10 : 0,
            maxLevelUsers,
            usersWithBadges,
            badgeUnlockRate: total > 0 ? Math.round((usersWithBadges / total) * 100) : 0,
            avgXP: total > 0 ? Math.round(totalXP / total) : 0,
            checkedAt: Date.now()
        };
    } catch (error) {
        logger.error('[HealthCheck] Gamification stats failed:', error);
        return {
            totalUsers: 0,
            avgLevel: 0,
            maxLevelUsers: 0,
            usersWithBadges: 0,
            badgeUnlockRate: 0,
            avgXP: 0,
            checkedAt: Date.now()
        };
    }
}

// ─── Security Overview ──────────────────────────────────────────────

export async function getSecurityOverview(usersSnapshot?: QuerySnapshot<DocumentData>): Promise<SecurityOverview> {
    try {
        const [snap, config] = await Promise.all([
            usersSnapshot ? Promise.resolve(usersSnapshot) : getDocs(query(collection(db, 'users'), where('isBanned', '==', true), limit(500))),
            getGlobalConfig()
        ]);

        // If shared snapshot is provided, we filter manually. Otherwise, the query above already does it.
        const bannedCount = usersSnapshot 
            ? snap.docs.filter(d => d.data().isBanned === true).length
            : snap.size;

        return {
            bannedUsersCount: bannedCount,
            maintenanceMode: config?.maintenance || false,
            registrationsOpen: config?.registrationsOpen ?? true,
            checkedAt: Date.now()
        };
    } catch (error) {
        logger.error('[HealthCheck] Security overview failed:', error);
        return {
            bannedUsersCount: 0,
            maintenanceMode: false,
            registrationsOpen: true,
            checkedAt: Date.now()
        };
    }
}

// ─── Community Content ──────────────────────────────────────────────

export async function getCommunityContentStats(): Promise<CommunityContentStats> {
    try {
        const [commentsSnap, tierListsSnap, watchPartiesSnap] = await Promise.all([
            getDocs(query(collection(db, 'comments'), limit(500))),
            getDocs(query(collection(db, 'tierLists'), limit(500))),
            getDocs(query(collection(db, 'watchparties'), limit(500)))
        ]);

        const publicTierLists = tierListsSnap.docs.filter(d => d.data().isPublic === true).length;
        const now = Date.now();
        const activeWatchParties = watchPartiesSnap.docs.filter(d => {
            const data = d.data();
            // Consider a party active if it was created/updated in the last 7 days
            const lastAction = data.lastAction?.toMillis?.() || data.createdAt?.toMillis?.() || 0;
            return now - lastAction < 7 * 24 * 60 * 60 * 1000;
        }).length;

        return {
            totalComments: commentsSnap.size,
            totalTierLists: tierListsSnap.size,
            publicTierLists,
            activeWatchParties,
            totalWatchParties: watchPartiesSnap.size,
            checkedAt: Date.now()
        };
    } catch (error) {
        logger.error('[HealthCheck] Community stats failed:', error);
        return {
            totalComments: 0,
            totalTierLists: 0,
            publicTierLists: 0,
            activeWatchParties: 0,
            totalWatchParties: 0,
            checkedAt: Date.now()
        };
    }
}

// ─── API Queue Stats ────────────────────────────────────────────────

export function getApiQueueStats(): ApiQueueStats {
    try {
        const status = jikanQueue.status;
        return {
            pending: status.pending,
            processing: status.active > 0,
            checkedAt: Date.now()
        };
    } catch (error) {
        return {
            pending: 0,
            processing: false,
            error: error instanceof Error ? error.message : 'Queue unavailable',
            checkedAt: Date.now()
        };
    }
}

// ─── Editorial Stats ────────────────────────────────────────────────

export async function getEditorialStats(): Promise<EditorialStats> {
    try {
        const newsSnap = await getDocs(
            query(collection(db, 'news'), orderBy('publishedAt', 'desc'), limit(1))
        );

        const totalSnap = await getDocs(query(collection(db, 'news'), limit(500)));

        const lastDoc = newsSnap.docs[0];
        let lastPublished: string | null = null;
        let lastTitle: string | null = null;

        if (lastDoc) {
            const data = lastDoc.data();
            lastPublished = data.publishedAt?.toDate?.()?.toISOString?.()
                || (typeof data.publishedAt === 'string' ? data.publishedAt : null);
            lastTitle = data.title || null;
        }

        return {
            totalNews: totalSnap.size,
            lastPublished,
            lastTitle,
            checkedAt: Date.now()
        };
    } catch (error) {
        logger.error('[HealthCheck] Editorial stats failed:', error);
        return {
            totalNews: 0,
            lastPublished: null,
            lastTitle: null,
            checkedAt: Date.now()
        };
    }
}

// ─── Challenge Stats ────────────────────────────────────────────────

export async function getChallengeStats(): Promise<ChallengeStats> {
    try {
        const challengesSnap = await getDocs(query(collection(db, 'challenges'), limit(500)));
        let active = 0;
        let completed = 0;
        const now = Date.now();

        challengesSnap.docs.forEach(d => {
            const data = d.data();
            const endDate = data.endDate?.toMillis?.() || data.endDate || 0;
            const startDate = data.startDate?.toMillis?.() || data.startDate || 0;

            if (endDate && endDate < now) {
                completed++;
            } else if (startDate && startDate <= now) {
                active++;
            }
        });

        return {
            totalChallenges: challengesSnap.size,
            activeChallenges: active,
            completedChallenges: completed,
            checkedAt: Date.now()
        };
    } catch (error) {
        logger.error('[HealthCheck] Challenge stats failed:', error);
        return {
            totalChallenges: 0,
            activeChallenges: 0,
            completedChallenges: 0,
            checkedAt: Date.now()
        };
    }
}

// ─── Survey Stats ───────────────────────────────────────────────────

export async function getSurveyStats(): Promise<SurveyStats> {
    try {
        const [responsesSnap, waitlistSnap] = await Promise.all([
            getDocs(query(collection(db, 'survey_responses'), limit(500))),
            getDocs(query(collection(db, 'survey_waitlist'), limit(500)))
        ]);

        return {
            totalResponses: responsesSnap.size,
            totalWaitlist: waitlistSnap.size,
            checkedAt: Date.now()
        };
    } catch (error) {
        logger.error('[HealthCheck] Survey stats failed:', error);
        return {
            totalResponses: 0,
            totalWaitlist: 0,
            checkedAt: Date.now()
        };
    }
}

// ─── Self-Healing ───────────────────────────────────────────────────

/** Scan and repair common data issues */
export async function runSelfHealing(adminName: string = "System"): Promise<{ repaired: number; errors: number; sessionId?: string }> {
    let repaired = 0;
    let errors = 0;
    const actions: RepairAction[] = [];

    try {
        const snap = await getDocs(query(collection(db, 'users'), limit(100))); // Batch size for safety
        
        const repairs = snap.docs.map(async (d) => {
            const data = d.data();
            const updates: DocumentData = {};
            const userChanges: string[] = [];
            
            // Fix 1: Missing DisplayName (use email prefix if available)
            if (!data.displayName || data.displayName.trim() === "") {
                const oldName = data.displayName || "empty";
                if (data.email) {
                    updates.displayName = data.email.split('@')[0];
                } else {
                    updates.displayName = `User_${d.id.substring(0, 5)}`;
                }
                userChanges.push(`Changed displayName from '${oldName}' to '${updates.displayName}'`);
            }

            // Fix 2: Corrupted numeric fields
            if (typeof data.level !== 'number') {
                updates.level = 1;
                userChanges.push(`Reset level (was ${typeof data.level}) to 1`);
            }
            if (typeof data.xp !== 'number') {
                updates.xp = 0;
                userChanges.push(`Reset xp (was ${typeof data.xp}) to 0`);
            }
            if (typeof data.totalXp !== 'number') {
                updates.totalXp = data.xp || 0;
                userChanges.push(`Re-calculated totalXp`);
            }

            // Fix 3: Missing Avatar (auto-assign Dicebear)
            if (!data.photoURL || data.photoURL.trim() === "") {
                const seed = updates.displayName || data.displayName || d.id;
                const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
                updates.photoURL = newAvatar;
                userChanges.push(`Auto-assigned profile picture (seed: ${seed})`);
            }

            if (Object.keys(updates).length > 0) {
                try {
                    await updateDoc(d.ref, updates);
                    repaired++;
                    actions.push({
                        uid: d.id,
                        userName: updates.displayName || data.displayName || "Unknown",
                        changes: userChanges
                    });
                } catch (e) {
                    errors++;
                    logger.error(`[SelfHealing] Failed to repair user ${d.id}:`, e);
                }
            }
        });

        await Promise.all(repairs);

        // Log the session if any repairs were made
        let sessionId: string | undefined;
        if (actions.length > 0 || errors > 0) {
            const session: RepairSession = {
                timestamp: serverTimestamp(),
                adminName,
                repairedCount: repaired,
                errorsCount: errors,
                actions
            };
            const sessionRef = await addDoc(collection(db, 'admin_repair_history'), session);
            sessionId = sessionRef.id;
        }

        return { repaired, errors, sessionId };
    } catch (error) {
        logger.error('[SelfHealing] Fatal error during scan:', error);
        return { repaired, errors: errors + 1 };
    }
}

/** Get recent repair history */
export async function getRepairHistory(maxEntries = 10): Promise<RepairSession[]> {
    try {
        const q = query(
            collection(db, 'admin_repair_history'),
            orderBy('timestamp', 'desc'),
            limit(maxEntries)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            timestamp: d.data().timestamp?.toMillis?.() || Date.now()
        }) as RepairSession);
    } catch (error) {
        logger.error('[HealthCheck] Error getting repair history:', error);
        return [];
    }
}

// ─── Discord Integration ────────────────────────────────────────────

export async function sendDiscordHealthAlert(webhookUrl: string, report: FullHealthReport, isTest = false): Promise<boolean> {
    console.log(`[DiscordAlert] Attempting to send ${isTest ? 'TEST ' : ''}alert to Discord...`);
    try {
        const hasDown = report.infrastructure.some(s => s.status === 'down');
        const statusEmoji = hasDown ? '🚨' : (report.overallScore >= 80 ? '✅' : report.overallScore >= 50 ? '⚠️' : '🚨');
        const statusLabel = hasDown ? "CRITICAL FAILURE" : (report.overallScore < 50 ? "CRITICAL HEALTH" : "Health Report");
        
        const payload = {
            username: "Bingeki System Monitor",
            embeds: [{
                title: `${statusEmoji} Bingeki ${statusLabel} ${isTest ? "(TEST)" : ""}`,
                color: hasDown || report.overallScore < 50 ? 0xe74c3c : report.overallScore >= 80 ? 0x27ae60 : 0xf1c40f,
                fields: [
                    { name: "Overall Score", value: `**${report.overallScore}/100**`, inline: true },
                    { name: "Users Scan", value: `${report.dataIntegrity.totalUsers} registered`, inline: true },
                    { name: "Infrastructure", value: report.infrastructure.map(s => `${s.status === 'operational' ? '🟢' : '🔴'} ${s.service}`).join('\n'), inline: false },
                    { name: "Data Integrity", value: `Missing Names: ${report.dataIntegrity.missingDisplayName}\nMissing Photos: ${report.dataIntegrity.missingPhotoURL}`, inline: true },
                    { name: "Gamification", value: `Avg Level: ${report.gamification.avgLevel}\nBadges: ${report.gamification.badgeUnlockRate}%`, inline: true }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: "Bingeki V2 Admin Dashboard" }
            }]
        };

        console.log('[DiscordAlert] Payload:', JSON.stringify(payload, null, 2));

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('[DiscordAlert] Successfully sent to Discord.');
            return true;
        } else {
            const errorText = await response.text();
            console.error(`[DiscordAlert] Discord API returned error ${response.status}:`, errorText);
            return false;
        }
    } catch (error) {
        console.error('[DiscordAlert] Fetch failed:', error);
        logger.error('[DiscordAlert] Send failed:', error);
        return false;
    }
}

// ─── Score History (PERSISTENT Firestore) ───────────────────────────

export async function saveHealthReportToHistory(report: FullHealthReport): Promise<void> {
    try {
        await addDoc(collection(db, 'admin_health_history'), {
            score: report.overallScore,
            timestamp: serverTimestamp(),
            summary: {
                infraStatus: report.infrastructure.every(s => s.status === 'operational') ? 'operational' : 'degraded',
                users: report.dataIntegrity.totalUsers,
                issues: report.dataIntegrity.missingDisplayName + report.dataIntegrity.missingPhotoURL
            }
        });
    } catch (error) {
        logger.error('[HealthCheck] Failed to save history to Firestore:', error);
    }
}

// ─── Full Health Report ─────────────────────────────────────────────

export async function getFullHealthReport(): Promise<FullHealthReport> {
    // 1. Fetch users once to share across multiple checks (Performance Optimization)
    const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));

    const [
        authResult, firestoreResult, storageResult, jikanResult,
        dataIntegrity, gamification, security,
        community, editorial, challenges, surveyData
    ] = await Promise.all([
        checkFirebaseAuth(),
        checkFirestore(),
        checkStorage(),
        checkJikan(),
        getDataIntegrityReport(usersSnap),
        getGamificationHealthStats(usersSnap),
        getSecurityOverview(usersSnap),
        getCommunityContentStats(),
        getEditorialStats(),
        getChallengeStats(),
        getSurveyStats()
    ]);

    const apiQueue = getApiQueueStats();
    const infrastructure = [authResult, firestoreResult, storageResult, jikanResult];

    // Compute overall score
    const infraScore = infrastructure.reduce((acc, svc) => {
        if (svc.status === 'operational') return acc + 25;
        if (svc.status === 'degraded') return acc + 12;
        return acc;
    }, 0);

    const overallScore = Math.round((infraScore + dataIntegrity.dataHealthScore) / 2);

    // Persist score for history
    saveHealthReportToHistory({ 
        overallScore, infrastructure, dataIntegrity, 
        gamification, security, community, apiQueue, 
        editorial, challenges, survey: surveyData, 
        jikan: null, checkedAt: Date.now() 
    });

    return {
        infrastructure,
        jikan: null,
        dataIntegrity,
        gamification,
        security,
        community,
        apiQueue,
        editorial,
        challenges,
        survey: surveyData,
        overallScore,
        checkedAt: Date.now()
    };
}
