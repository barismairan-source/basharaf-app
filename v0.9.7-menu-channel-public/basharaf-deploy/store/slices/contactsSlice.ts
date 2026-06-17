import type { StateCreator } from 'zustand';
import type { Contact } from '@/types';

/**
 * ContactsSlice — مدیریت طرف‌حساب‌ها (بدهکار/بستانکار).
 */
export interface ContactsSlice {
  contacts: Contact[];
  contactsLoaded: boolean;
  contactsError: string | null;
  loadContacts: () => Promise<void>;
  createContact: (params: { name: string; type: string; phone?: string | null; note?: string | null }) => Promise<Contact | null>;
  updateContact: (id: string, patch: Partial<Pick<Contact, 'name' | 'type' | 'phone' | 'note'>>) => Promise<boolean>;
  deleteContact: (id: string) => Promise<boolean>;
}

export const createContactsSlice: StateCreator<ContactsSlice> = (set, get) => ({
  contacts: [],
  contactsLoaded: false,
  contactsError: null,

  async loadContacts() {
    try {
      const res = await fetch('/api/contacts', { credentials: 'include' });
      if (!res.ok) return;
      const { contacts } = (await res.json()) as { contacts: Contact[] };
      set({ contacts, contactsLoaded: true });
    } catch {
      set({ contactsLoaded: true });
    }
  },

  async createContact(params) {
    const tempId = `optimistic-${Date.now()}`;
    const optimistic: Contact = {
      id: tempId, name: params.name, type: params.type,
      phone: params.phone ?? null, note: params.note ?? null,
      balance: 0, isActive: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    set(s => ({ contacts: [...s.contacts, optimistic], contactsError: null }));

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(params),
      });
      const data = (await res.json()) as { contact?: Contact; error?: string };
      if (!res.ok || !data.contact) throw new Error(data.error ?? 'خطا');
      set(s => ({ contacts: s.contacts.map(c => c.id === tempId ? data.contact! : c) }));
      return data.contact;
    } catch (e) {
      set(s => ({ contacts: s.contacts.filter(c => c.id !== tempId), contactsError: e instanceof Error ? e.message : 'خطا' }));
      return null;
    }
  },

  async updateContact(id, patch) {
    const snapshot = get().contacts.find(c => c.id === id);
    if (!snapshot) return false;
    set(s => ({ contacts: s.contacts.map(c => c.id === id ? { ...c, ...patch } : c) }));
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set(s => ({ contacts: s.contacts.map(c => c.id === id ? snapshot : c) }));
      return false;
    }
  },

  async deleteContact(id) {
    const snapshot = get().contacts.find(c => c.id === id);
    if (!snapshot) return false;
    set(s => ({ contacts: s.contacts.filter(c => c.id !== id) }));
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set(s => ({ contacts: [snapshot, ...s.contacts] }));
      return false;
    }
  },
});
