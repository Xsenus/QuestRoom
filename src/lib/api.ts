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
  async getQuests(visible?: boolean) {
    const params = visible !== undefined ? `?visible=${visible}` : '';
    return this.request(`/quests${params}`);
  }

  async getQuest(id: string) {
    return this.request(`/quests/${id}`);
  }

  async createQuest(quest: any) {
    return this.request('/quests', {
      method: 'POST',
      body: JSON.stringify(quest),
    });
  }

  async updateQuest(id: string, quest: any) {
    return this.request(`/quests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quest),
    });
  }

  async deleteQuest(id: string) {
    return this.request(`/quests/${id}`, {
      method: 'DELETE',
    });
  }

  // Schedule
  async getQuestSchedule(questId: string, fromDate?: string, toDate?: string) {
    let params = '';
    if (fromDate || toDate) {
      const urlParams = new URLSearchParams();
      if (fromDate) urlParams.append('fromDate', fromDate);
      if (toDate) urlParams.append('toDate', toDate);
      params = `?${urlParams.toString()}`;
    }
    return this.request(`/schedule/quest/${questId}${params}`);
  }

  async createScheduleSlot(slot: any) {
    return this.request('/schedule', {
      method: 'POST',
      body: JSON.stringify(slot),
    });
  }

  async updateScheduleSlot(id: string, slot: any) {
    return this.request(`/schedule/${id}`, {
      method: 'PUT',
      body: JSON.stringify(slot),
    });
  }

  // Bookings
  async getBookings() {
    return this.request('/bookings');
  }

  async createBooking(booking: any) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
  }

  async updateBooking(id: string, booking: any) {
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
  async getRules(visible?: boolean) {
    const params = visible !== undefined ? `?visible=${visible}` : '';
    return this.request(`/rules${params}`);
  }

  async createRule(rule: any) {
    return this.request('/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  }

  async updateRule(id: string, rule: any) {
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
  async getReviews(visible?: boolean) {
    const params = visible !== undefined ? `?visible=${visible}` : '';
    return this.request(`/reviews${params}`);
  }

  async createReview(review: any) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(review),
    });
  }

  async updateReview(id: string, review: any) {
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
  async getPromotions(active?: boolean) {
    const params = active !== undefined ? `?active=${active}` : '';
    return this.request(`/promotions${params}`);
  }

  async createPromotion(promotion: any) {
    return this.request('/promotions', {
      method: 'POST',
      body: JSON.stringify(promotion),
    });
  }

  async updatePromotion(id: string, promotion: any) {
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
  async getCertificates(visible?: boolean) {
    const params = visible !== undefined ? `?visible=${visible}` : '';
    return this.request(`/certificates${params}`);
  }

  async createCertificate(certificate: any) {
    return this.request('/certificates', {
      method: 'POST',
      body: JSON.stringify(certificate),
    });
  }

  async updateCertificate(id: string, certificate: any) {
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
  async getAboutInfo() {
    return this.request('/about');
  }

  async updateAboutInfo(about: any) {
    return this.request('/about', {
      method: 'PUT',
      body: JSON.stringify(about),
    });
  }

  // Settings
  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(settings: any) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }
}

export const api = new ApiClient();
