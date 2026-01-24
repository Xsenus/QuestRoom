import type {
  AboutInfo,
  AboutInfoUpdate,
  Booking,
  BookingCreate,
  BookingUpdate,
  Certificate,
  CertificateOrder,
  CertificateOrderCreate,
  CertificateOrderUpdate,
  CertificateUpsert,
  DurationBadge,
  ImageAsset,
  Promotion,
  PromotionUpsert,
  Quest,
  QuestPricingRule,
  QuestPricingRuleUpsert,
  QuestSchedule,
  QuestScheduleUpsert,
  ScheduleGenerateRequest,
  QuestUpsert,
  Review,
  ReviewUpsert,
  Rule,
  RuleUpsert,
  Settings,
  SettingsUpdate,
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const tokenKeys = ['auth_token', 'token'];
const tokenExpiryKey = 'auth_expires_at';
const tokenTtlMs = 1000 * 60 * 60 * 24 * 7;

const normalizeToken = (token: string | null) => {
  if (!token || token === 'null' || token === 'undefined') {
    return null;
  }
  return token;
};

const clearAuthStorage = () => {
  for (const key of tokenKeys) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_role');
  localStorage.removeItem(tokenExpiryKey);
};

const hasTokenExpired = () => {
  const expiresAtRaw = localStorage.getItem(tokenExpiryKey);
  if (!expiresAtRaw) {
    return false;
  }
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) {
    return false;
  }
  return Date.now() > expiresAt;
};

const getAuthToken = () => {
  if (hasTokenExpired()) {
    clearAuthStorage();
    return null;
  }
  for (const key of tokenKeys) {
    const stored = normalizeToken(localStorage.getItem(key));
    if (stored) {
      return stored;
    }
  }

  for (const key of tokenKeys) {
    const stored = normalizeToken(sessionStorage.getItem(key));
    if (stored) {
      return stored;
    }
  }

  return null;
};

const buildAuthHeaders = (options: RequestInit) => {
  const headers = new Headers(options.headers);
  const token = getAuthToken();

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
};

class ApiClient {
  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: buildAuthHeaders(options),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const token = data.token ?? data.Token;
    const userEmail = data.email ?? data.Email;
    const userRole = data.role ?? data.Role;

    if (token) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem(tokenExpiryKey, String(Date.now() + tokenTtlMs));
      if (userEmail) {
        localStorage.setItem('user_email', userEmail);
      }
      if (userRole) {
        localStorage.setItem('user_role', userRole);
      }
    }

    return {
      ...data,
      token,
      email: userEmail,
      role: userRole,
    };
  }

  logout() {
    clearAuthStorage();
  }

  isAuthenticated() {
    return !!getAuthToken();
  }

  getUserRole() {
    return localStorage.getItem('user_role') || '';
  }

  // Quests
  async getQuests(visible?: boolean): Promise<Quest[]> {
    const params = visible !== undefined ? `?visible=${visible}` : '';
    return this.request(`/quests${params}`);
  }

  async getQuest(id: string): Promise<Quest> {
    return this.request(`/quests/${id}`);
  }

  async createQuest(quest: QuestUpsert): Promise<Quest> {
    return this.request('/quests', {
      method: 'POST',
      body: JSON.stringify(quest),
    });
  }

  async updateQuest(id: string, quest: QuestUpsert) {
    return this.request(`/quests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quest),
    });
  }

  async getDurationBadges(): Promise<DurationBadge[]> {
    return this.request('/durationbadges');
  }

  async deleteQuest(id: string) {
    return this.request(`/quests/${id}`, {
      method: 'DELETE',
    });
  }

  // Schedule
  async getQuestSchedule(
    questId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<QuestSchedule[]> {
    let params = '';
    if (fromDate || toDate) {
      const urlParams = new URLSearchParams();
      if (fromDate) urlParams.append('fromDate', fromDate);
      if (toDate) urlParams.append('toDate', toDate);
      params = `?${urlParams.toString()}`;
    }
    return this.request(`/schedule/quest/${questId}${params}`);
  }

  async createScheduleSlot(slot: QuestScheduleUpsert): Promise<QuestSchedule> {
    return this.request('/schedule', {
      method: 'POST',
      body: JSON.stringify(slot),
    });
  }

  async updateScheduleSlot(id: string, slot: QuestScheduleUpsert) {
    return this.request(`/schedule/${id}`, {
      method: 'PUT',
      body: JSON.stringify(slot),
    });
  }

  async generateSchedule(request: ScheduleGenerateRequest): Promise<{ createdCount: number }> {
    return this.request('/schedule/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Pricing rules
  async getPricingRules(questId?: string): Promise<QuestPricingRule[]> {
    const params = questId ? `?questId=${questId}` : '';
    return this.request(`/pricingrules${params}`);
  }

  async createPricingRule(rule: QuestPricingRuleUpsert): Promise<QuestPricingRule> {
    return this.request('/pricingrules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  }

  async updatePricingRule(id: string, rule: QuestPricingRuleUpsert) {
    return this.request(`/pricingrules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    });
  }

  async deletePricingRule(id: string) {
    return this.request(`/pricingrules/${id}`, {
      method: 'DELETE',
    });
  }

  // Images
  async uploadImage(file: File): Promise<ImageAsset> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/images`, {
      method: 'POST',
      headers: {
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Bookings
  async getBookings(): Promise<Booking[]> {
    return this.request('/bookings');
  }

  async createBooking(booking: BookingCreate): Promise<Booking> {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
  }

  async updateBooking(id: string, booking: BookingUpdate) {
    return this.request(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(booking),
    });
  }

  async deleteBooking(id: string) {
    return this.request(`/bookings/${id}`, {
      method: 'DELETE',
    });
  }

  // Rules
  async getRules(visible?: boolean): Promise<Rule[]> {
    const params = visible !== undefined ? `?visible=${visible}` : '';
    return this.request(`/rules${params}`);
  }

  async createRule(rule: RuleUpsert): Promise<Rule> {
    return this.request('/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  }

  async updateRule(id: string, rule: RuleUpsert) {
    return this.request(`/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    });
  }

  async deleteRule(id: string) {
    return this.request(`/rules/${id}`, {
      method: 'DELETE',
    });
  }

  // Reviews
  async getReviews(visible?: boolean): Promise<Review[]> {
    const params = visible !== undefined ? `?visible=${visible}` : '';
    return this.request(`/reviews${params}`);
  }

  async createReview(review: ReviewUpsert): Promise<Review> {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(review),
    });
  }

  async updateReview(id: string, review: ReviewUpsert) {
    return this.request(`/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(review),
    });
  }

  async deleteReview(id: string) {
    return this.request(`/reviews/${id}`, {
      method: 'DELETE',
    });
  }

  // Promotions
  async getPromotions(active?: boolean): Promise<Promotion[]> {
    const params = active !== undefined ? `?active=${active}` : '';
    return this.request(`/promotions${params}`);
  }

  async createPromotion(promotion: PromotionUpsert): Promise<Promotion> {
    return this.request('/promotions', {
      method: 'POST',
      body: JSON.stringify(promotion),
    });
  }

  async updatePromotion(id: string, promotion: PromotionUpsert) {
    return this.request(`/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(promotion),
    });
  }

  async deletePromotion(id: string) {
    return this.request(`/promotions/${id}`, {
      method: 'DELETE',
    });
  }

  // Certificates
  async getCertificates(visible?: boolean): Promise<Certificate[]> {
    const params = visible !== undefined ? `?visible=${visible}` : '';
    return this.request(`/certificates${params}`);
  }

  async createCertificate(certificate: CertificateUpsert): Promise<Certificate> {
    return this.request('/certificates', {
      method: 'POST',
      body: JSON.stringify(certificate),
    });
  }

  async updateCertificate(id: string, certificate: CertificateUpsert) {
    return this.request(`/certificates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(certificate),
    });
  }

  async deleteCertificate(id: string) {
    return this.request(`/certificates/${id}`, {
      method: 'DELETE',
    });
  }

  // Certificate orders
  async getCertificateOrders(): Promise<CertificateOrder[]> {
    return this.request('/certificateorders');
  }

  async createCertificateOrder(order: CertificateOrderCreate): Promise<CertificateOrder> {
    return this.request('/certificateorders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async updateCertificateOrder(id: string, order: CertificateOrderUpdate) {
    return this.request(`/certificateorders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(order),
    });
  }

  // About
  async getAboutInfo(): Promise<AboutInfo> {
    return this.request('/about');
  }

  async updateAboutInfo(about: AboutInfoUpdate) {
    return this.request('/about', {
      method: 'PUT',
      body: JSON.stringify(about),
    });
  }

  // Settings
  async getSettings(): Promise<Settings> {
    return this.request('/settings');
  }

  async updateSettings(settings: SettingsUpdate) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }
}

export const api = new ApiClient();
