import React, { createContext, useContext, useEffect, useState } from 'react';
import { policyService, workerService } from '../services/api';

const SESSION_KEY = 'easykavach.session';
const ADMIN_CODE = import.meta.env.VITE_EASYKAVACH_ADMIN_CODE || 'EASYKAVACH-ADMIN';

const AuthContext = createContext(null);

function safeParseSession(raw) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function readStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  return safeParseSession(window.localStorage.getItem(SESSION_KEY));
}

function persistSession(session) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function normalizePhone(phone = '') {
  return String(phone).replace(/\D/g, '');
}

async function loadWorkerPolicy(workerId) {
  try {
    const res = await policyService.getWorkerPolicies(workerId);
    return Array.isArray(res.data) ? res.data[0] || null : null;
  } catch (error) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());

  useEffect(() => {
    persistSession(session);
  }, [session]);

  const registerWorker = async (payload) => {
    const res = await workerService.register({
      ...payload,
      shifts: Array.isArray(payload.shifts) ? payload.shifts : [],
    });

    const worker = res.data?.worker || res.data;
    const quote = res.data?.quote || null;
    const policy = res.data?.policy || (worker?.id ? await loadWorkerPolicy(worker.id) : null);
    const nextSession = { type: 'worker', worker, policy, quote };
    setSession(nextSession);
    return nextSession;
  };

  const loginWorker = async ({ phone }) => {
    const res = await workerService.listWorkers();
    const workers = Array.isArray(res.data) ? res.data : [];
    const worker = workers.find(
      (item) => normalizePhone(item.phone) === normalizePhone(phone),
    );

    if (!worker) {
      throw new Error('No worker profile found for that phone number.');
    }

    const policy = await loadWorkerPolicy(worker.id);
    const nextSession = { type: 'worker', worker, policy };
    setSession(nextSession);
    return nextSession;
  };

  const loginAdmin = async (code) => {
    if (String(code).trim() !== ADMIN_CODE) {
      throw new Error('Invalid access code.');
    }

    const nextSession = {
      type: 'admin',
      admin: {
        label: 'EasyKavach Admin',
      },
    };
    setSession(nextSession);
    return nextSession;
  };

  const logout = () => {
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: Boolean(session),
        isWorker: session?.type === 'worker',
        isAdmin: session?.type === 'admin',
        registerWorker,
        loginWorker,
        loginAdmin,
        logout,
        setSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
