import { StorageData, User } from './types';

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5000/api';


export async function getToken(): Promise<string | undefined> {
  const data = await chrome.storage.local.get('token') as StorageData;
  return data.token;
}

export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ token });
}

export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove('token');
}

export async function getRefreshToken(): Promise<string | undefined> {
  const data = await chrome.storage.local.get('refreshToken') as StorageData;
  return data.refreshToken;
}

export async function setRefreshToken(token: string): Promise<void> {
  await chrome.storage.local.set({ refreshToken: token });
}

export async function clearRefreshToken(): Promise<void> {
  await chrome.storage.local.remove('refreshToken');
}

export async function getUser(): Promise<User | undefined> {
  const data = await chrome.storage.local.get('user') as StorageData;
  return data.user;
}

export async function setUser(user: User): Promise<void> {
  await chrome.storage.local.set({ user });
}

export async function clearUser(): Promise<void> {
  await chrome.storage.local.remove('user');
}

export async function getApiBase(): Promise<string> {
  const data = await chrome.storage.local.get('apiBase') as StorageData;
  return data.apiBase ?? DEFAULT_API_BASE;
}

export async function setApiBase(url: string): Promise<void> {
  await chrome.storage.local.set({ apiBase: url });
}

export async function clearAll(): Promise<void> {
  await chrome.storage.local.clear();
}
