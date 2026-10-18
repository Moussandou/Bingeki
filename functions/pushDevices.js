const { onCall, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { CALLABLE_REGIONS } = require('./regions');
const { mutateDevice } = require('./pushDevicesCore');

function callable(operation) {
    return onCall({ cors: true, region: CALLABLE_REGIONS }, async request => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to manage push devices.');
        if (request.auth.token?.firebase?.sign_in_provider === 'anonymous') {
            throw new HttpsError('permission-denied', 'A non-anonymous account is required.');
        }
        try {
            return await mutateDevice(admin.firestore(), request.auth.uid, request.data, operation);
        } catch (error) {
            if (error instanceof HttpsError) throw error;
            // SDK errors can contain document contents or paths; never log them here.
            logger.error('Push device operation failed.');
            throw new HttpsError('internal', 'Push device operation failed.');
        }
    });
}

exports.registerPushDevice = callable('register');
exports.revokePushDevice = callable('revoke');
