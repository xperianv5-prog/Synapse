export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  streakDays: number;
  tier: 'PRO' | 'PLUS' | 'FREE';
  createdAt: string;
  dailyGoal?: number;
}

const SESSION_KEY = 'recall_user_session_v1';
const USERS_DB_KEY = 'recall_registered_users_v1';

export const DEFAULT_MOCK_USER: UserProfile = {
  id: 'user_alex_reed',
  name: 'Alex Reed',
  email: 'alex.reed@recall.study',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  streakDays: 7,
  tier: 'PRO',
  createdAt: new Date().toISOString(),
  dailyGoal: 25,
};

function getStoredUsers(): Record<string, { password: string; profile: UserProfile }> {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredUsers(users: Record<string, { password: string; profile: UserProfile }>) {
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users database', err);
  }
}

export function getCurrentUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      // Default to standard logged-in mock user for instant testability
      saveUserSession(DEFAULT_MOCK_USER);
      return DEFAULT_MOCK_USER;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_MOCK_USER;
  }
}

export function saveUserSession(user: UserProfile) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save session', err);
  }
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.error('Failed to logout', err);
  }
}

export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  // Simulate network latency
  await new Promise(r => setTimeout(r, 450));

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    throw new Error('Please enter both email and password.');
  }

  const users = getStoredUsers();
  const registered = users[trimmedEmail];

  if (registered) {
    if (registered.password !== password) {
      throw new Error('Incorrect password. Please try again.');
    }
    saveUserSession(registered.profile);
    return registered.profile;
  }

  // If user not explicitly registered yet, generate an account for immediate testing
  const fallbackProfile: UserProfile = {
    id: `usr_${Math.random().toString(36).substring(2, 9)}`,
    name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    email: trimmedEmail,
    avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${trimmedEmail}`,
    streakDays: 1,
    tier: 'PRO',
    createdAt: new Date().toISOString(),
    dailyGoal: 20,
  };

  users[trimmedEmail] = { password, profile: fallbackProfile };
  saveStoredUsers(users);
  saveUserSession(fallbackProfile);
  return fallbackProfile;
}

export async function registerWithEmail(name: string, email: string, password: string, learningGoal?: string): Promise<UserProfile> {
  // Simulate network latency
  await new Promise(r => setTimeout(r, 500));

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  if (!trimmedName) throw new Error('Please provide your full name.');
  if (!trimmedEmail || !trimmedEmail.includes('@')) throw new Error('Please enter a valid email address.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');

  const users = getStoredUsers();

  const newProfile: UserProfile = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: trimmedName,
    email: trimmedEmail,
    avatarUrl: `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(trimmedName)}`,
    streakDays: 1,
    tier: 'PRO',
    createdAt: new Date().toISOString(),
    dailyGoal: learningGoal ? parseInt(learningGoal, 10) || 20 : 20,
  };

  users[trimmedEmail] = { password, profile: newProfile };
  saveStoredUsers(users);
  saveUserSession(newProfile);
  return newProfile;
}

export async function loginWithGoogle(): Promise<UserProfile> {
  // Simulate Google OAuth popup handshake
  await new Promise(r => setTimeout(r, 600));

  const googleUser: UserProfile = {
    id: 'google_oauth_learner_99',
    name: 'Sarah Chen',
    email: 'sarah.chen@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    streakDays: 12,
    tier: 'PRO',
    createdAt: new Date().toISOString(),
    dailyGoal: 30,
  };

  saveUserSession(googleUser);
  return googleUser;
}
