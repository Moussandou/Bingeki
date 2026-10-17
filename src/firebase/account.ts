import { httpsCallable } from 'firebase/functions';
import { signOut, type User } from 'firebase/auth';
import { auth, functions } from './config';
import { activateLibraryOwner } from '@/utils/libraryAccountScope';

export async function deleteOwnAccount(user: Pick<User, 'uid' | 'getIdToken'>): Promise<void> {
    await user.getIdToken(true);
    const result = await httpsCallable<void, { ok: boolean }>(functions, 'deleteOwnAccount')();
    if (result.data.ok !== true) throw new Error('Account cleanup was not confirmed.');
    // Do not use logout(): it flushes the library back to the deleted account.
    await signOut(auth);
    // The auth listener may run before or after signOut resolves.
    activateLibraryOwner(null);
    localStorage.removeItem(`bingeki-account-snapshot:user:${user.uid}`);
}
