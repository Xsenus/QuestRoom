import type {
  AboutInfo,
  AboutInfoUpdate,
  Booking,
  BookingCreate,
  BookingUpdate,
  Certificate,
  CertificateUpsert,
  DurationBadge,
  Promotion,
  PromotionUpsert,
  Quest,
  QuestSchedule,
  QuestScheduleUpsert,
  QuestUpsert,
  Review,
  ReviewUpsert,
  Rule,
  RuleUpsert,
  Settings,
  SettingsUpdate,
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

class ApiClient {
  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
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

    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_email', data.email);
      localStorage.setItem('user_role', data.role);
    }

    return data;
  }

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
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
