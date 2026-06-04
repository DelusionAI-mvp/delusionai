import { collection, addDoc, query, onSnapshot, orderBy, limit, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from './firebase';

export interface UserNotification {
  id: string;
  text: string;
  type: 'accept' | 'reject' | 'message' | 'request' | 'system';
  createdAt: string;
  read: boolean;
  senderId?: string;
  senderName?: string;
  connectionId?: string;
}

/**
 * Creates a notification for a target user.
 */
export async function createNotification(
  targetUserId: string,
  notification: Omit<UserNotification, 'id' | 'createdAt' | 'read'>
) {
  if (!targetUserId) {
    console.warn('[createNotification] Cannot create notification: No targetUserId specified.');
    return;
  }

  // Ensure user is authenticated before performing db operations
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn('[createNotification] Cannot create notification: User is unauthenticated.');
    return;
  }

  try {
    const notifCol = collection(db, 'users', targetUserId, 'notifications');
    await addDoc(notifCol, {
      ...notification,
      createdAt: new Date().toISOString(),
      read: false,
    });
  } catch (error) {
    console.error(`Error creating notification for user ${targetUserId}:`, error);
    handleFirestoreError(error, OperationType.CREATE, `users/${targetUserId}/notifications`);
  }
}

/**
 * Subscribes to a user's notifications in real-time.
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: UserNotification[]) => void
) {
  // If the userId is null, undefined or empty, prevent subscription and log warning
  if (!userId) {
    console.warn('[subscribeToNotifications] Prevented subscription: No userId was provided.');
    callback([]);
    return () => {};
  }

  // Ensure current authentication state has loaded and user is authenticated
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn(`[subscribeToNotifications] Prevented subscription for user ${userId}: Firebase Authentication is still loading or unauthenticated.`);
    callback([]);
    return () => {};
  }

  // Double check authorization to prevent "Missing/insufficient permissions" errors
  if (currentUser.uid !== userId) {
    console.warn(`[subscribeToNotifications] Prevented subscription: Authenticated user matches UID ${currentUser.uid}, but requested target is ${userId}. This violates security rules.`);
    callback([]);
    return () => {};
  }

  try {
    const notifCol = collection(db, 'users', userId, 'notifications');
    const q = query(notifCol, orderBy('createdAt', 'desc'), limit(50));

    return onSnapshot(q, (snap) => {
      const notifs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as UserNotification[];
      callback(notifs);
    }, (err) => {
      const isPermissionError = err instanceof Error ? err.message.includes('permission') : String(err).includes('permission');
      if (isPermissionError) {
        console.warn(`[Firestore Status] Notifications subscription is restricted for user ${userId}. Ensure your firestore.rules are deployed to your Firebase console.`);
        callback([]);
      } else {
        console.error(`Error subscribing to notifications for user ${userId}:`, err);
        callback([]);
      }
    });
  } catch (error) {
    console.error(`[subscribeToNotifications] Error setting up listener for user ${userId}:`, error);
    callback([]);
    return () => {};
  }
}

/**
 * Marks a notification as read.
 */
export async function markNotificationAsRead(userId: string, notifId: string) {
  if (!userId || !notifId) {
    console.warn('[markNotificationAsRead] Cannot mark notification as read: Missing userId or notifId.');
    return;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn('[markNotificationAsRead] Cannot mark notification: User is unauthenticated.');
    return;
  }

  if (currentUser.uid !== userId) {
    console.warn(`[markNotificationAsRead] Operation blocked: Authenticated user matches UID ${currentUser.uid}, target is ${userId}.`);
    return;
  }

  try {
    const notifRef = doc(db, 'users', userId, 'notifications', notifId);
    await updateDoc(notifRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/notifications/${notifId}`);
  }
}

/**
 * Deletes a notification.
 */
export async function deleteNotification(userId: string, notifId: string) {
  if (!userId || !notifId) {
    console.warn('[deleteNotification] Cannot delete notification: Missing userId or notifId.');
    return;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn('[deleteNotification] Cannot delete notification: User is unauthenticated.');
    return;
  }

  if (currentUser.uid !== userId) {
    console.warn(`[deleteNotification] Operation blocked: Authenticated user matches UID ${currentUser.uid}, target is ${userId}.`);
    return;
  }

  try {
    const notifRef = doc(db, 'users', userId, 'notifications', notifId);
    await deleteDoc(notifRef);
  } catch (error) {
    console.error('Error deleting notification:', error);
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/notifications/${notifId}`);
  }
}
