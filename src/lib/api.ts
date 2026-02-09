import type {
  AboutInfo,
  AboutInfoUpdate,
  AdminUser,
  AdminUserUpsert,
  BlacklistEntry,
  BlacklistEntryUpsert,
  BlacklistMatch,
  Booking,
  BookingCreate,
  BookingFiltersMeta,
  BookingImportResult,
  BookingTablePreferences,
  BookingUpdate,
  Certificate,
  CertificateOrder,
  CertificateOrderCreate,
  CertificateOrderUpdate,
  CertificateUpsert,
  DurationBadge,
  ImageAsset,
  PermissionGroup,
  Promotion,
  PromotionUpsert,
  PromoCode,
  PromoCodeUpsert,
  ProductionCalendarDay,
  ProductionCalendarDayUpsert,
  Quest,
  QuestPricingRule,
  QuestPricingRuleUpsert,
  QuestSchedule,
  QuestScheduleUpsert,
  QuestScheduleOverride,
  QuestScheduleOverrideUpsert,
  QuestScheduleSettings,
  QuestScheduleSettingsUpsert,
  QuestWeeklySlot,
  QuestWeeklySlotUpsert,
  ScheduleGenerateRequest,
  QuestUpsert,
  Review,
  ReviewUpsert,
  Rule,
  RuleUpsert,
  RoleDefinition,
  Settings,
  SettingsUpdate,
  StandardExtraService,
  StandardExtraServiceUpsert,
  TeaZone,
  TeaZoneUpsert,
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const tokenKeys = ['auth_token', 'token'];
const permissionsStorageKey = 'user_permissions';
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
  localStorage.removeItem(permissionsStorageKey);
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
      const rawText = await response.text();
      let parsedError: unknown = null;

      if (rawText) {
        try {
          parsedError = JSON.parse(rawText);
        } catch {
          parsedError = null;
        }
      }

      if (typeof parsedError === 'string') {
        throw new Error(parsedError);
      }

      if (parsedError && typeof parsedError === 'object') {
        const message = (parsedError as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          throw new Error(message);
        }
      }

      throw new Error(rawText || `HTTP ${response.status}`);
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
    const userPermissions = data.permissions ?? data.Permissions ?? [];

    if (token) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem(tokenExpiryKey, String(Date.now() + tokenTtlMs));
      if (userEmail) {
        localStorage.setItem('user_email', userEmail);
      }
      if (userRole) {
        localStorage.setItem('user_role', userRole);
      }
      if (Array.isArray(userPermissions)) {
        localStorage.setItem(permissionsStorageKey, JSON.stringify(userPermissions));
      }
    }

    return {
      ...data,
      token,
      email: userEmail,
      role: userRole,
      permissions: userPermissions,
    };
  }

  async getCurrentUser() {
    return this.request('/auth/me');
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

  // Admin users & roles
  async getAdminUsers(): Promise<AdminUser[]> {
    return this.request('/admin/users');
  }

  async getAdminUser(id: string): Promise<AdminUser> {
    return this.request(`/admin/users/${id}`);
  }

  async createAdminUser(payload: AdminUserUpsert): Promise<AdminUser> {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAdminUser(id: string, payload: AdminUserUpsert): Promise<AdminUser> {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async updateAdminUserStatus(id: string, status: AdminUser['status']): Promise<AdminUser> {
    return this.request(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateAdminUserPassword(id: string, password: string) {
    return this.request(`/admin/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
  }

  async deleteAdminUser(id: string) {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getRoles(): Promise<RoleDefinition[]> {
    return this.request('/roles');
  }

  async getRole(id: string): Promise<RoleDefinition> {
    return this.request(`/roles/${id}`);
  }

  async createRole(payload: Pick<RoleDefinition, 'name' | 'description' | 'permissions'>) {
    return this.request('/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateRole(id: string, payload: Pick<RoleDefinition, 'name' | 'description' | 'permissions'>) {
    return this.request(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteRole(id: string) {
    return this.request(`/roles/${id}`, {
      method: 'DELETE',
    });
  }

  async getPermissionGroups(): Promise<PermissionGroup[]> {
    return this.request('/roles/permission-groups');
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

  // Standard extra services
  async getStandardExtraServices(active?: boolean): Promise<StandardExtraService[]> {
    const params = active !== undefined ? `?active=${active}` : '';
    return this.request(`/standardextraservices${params}`);
  }

  async createStandardExtraService(payload: StandardExtraServiceUpsert) {
    return this.request('/standardextraservices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateStandardExtraService(id: string, payload: StandardExtraServiceUpsert) {
    return this.request(`/standardextraservices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteStandardExtraService(id: string) {
    return this.request(`/standardextraservices/${id}`, {
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

  async getQuestWeeklySlots(questId: string): Promise<QuestWeeklySlot[]> {
    return this.request(`/schedule/weekly/${questId}`);
  }

  async createQuestWeeklySlot(slot: QuestWeeklySlotUpsert): Promise<QuestWeeklySlot> {
    return this.request('/schedule/weekly', {
      method: 'POST',
      body: JSON.stringify(slot),
    });
  }

  async updateQuestWeeklySlot(id: string, slot: QuestWeeklySlotUpsert) {
    return this.request(`/schedule/weekly/${id}`, {
      method: 'PUT',
      body: JSON.stringify(slot),
    });
  }

  async deleteQuestWeeklySlot(id: string) {
    return this.request(`/schedule/weekly/${id}`, {
      method: 'DELETE',
    });
  }

  async getQuestScheduleOverrides(
    questId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<QuestScheduleOverride[]> {
    let params = '';
    if (fromDate || toDate) {
      const urlParams = new URLSearchParams();
      if (fromDate) urlParams.append('fromDate', fromDate);
      if (toDate) urlParams.append('toDate', toDate);
      params = `?${urlParams.toString()}`;
    }
    return this.request(`/schedule/overrides/${questId}${params}`);
  }

  async createQuestScheduleOverride(
    payload: QuestScheduleOverrideUpsert
  ): Promise<QuestScheduleOverride> {
    return this.request('/schedule/overrides', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateQuestScheduleOverride(id: string, payload: QuestScheduleOverrideUpsert) {
    return this.request(`/schedule/overrides/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteQuestScheduleOverride(id: string) {
    return this.request(`/schedule/overrides/${id}`, {
      method: 'DELETE',
    });
  }

  async getQuestScheduleSettings(questId: string): Promise<QuestScheduleSettings> {
    return this.request(`/schedule/settings/${questId}`);
  }

  async updateQuestScheduleSettings(
    payload: QuestScheduleSettingsUpsert
  ): Promise<QuestScheduleSettings> {
    return this.request('/schedule/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
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

  async getImages(params?: { limit?: number; offset?: number }): Promise<ImageAsset[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return this.request(`/images${query ? `?${query}` : ''}`);
  }

  async deleteImage(id: string) {
    return this.request(`/images/${id}`, {
      method: 'DELETE',
    });
  }

  // Bookings
  async getBookings(params?: {
    status?: string;
    questId?: string;
    aggregator?: string;
    promoCode?: string;
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }): Promise<Booking[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.questId) searchParams.set('questId', params.questId);
    if (params?.aggregator) searchParams.set('aggregator', params.aggregator);
    if (params?.promoCode) searchParams.set('promoCode', params.promoCode);
    if (params?.searchQuery) searchParams.set('searchQuery', params.searchQuery);
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return this.request(`/bookings${query ? `?${query}` : ''}`);
  }


  async getBookingsCount(params?: {
    status?: string;
    questId?: string;
    aggregator?: string;
    promoCode?: string;
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<number> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.questId) searchParams.set('questId', params.questId);
    if (params?.aggregator) searchParams.set('aggregator', params.aggregator);
    if (params?.promoCode) searchParams.set('promoCode', params.promoCode);
    if (params?.searchQuery) searchParams.set('searchQuery', params.searchQuery);
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
    const query = searchParams.toString();
    return this.request(`/bookings/count${query ? `?${query}` : ''}`);
  }

  async getBookingsFiltersMeta(params?: {
    aggregator?: string;
    promoCode?: string;
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<BookingFiltersMeta> {
    const searchParams = new URLSearchParams();
    if (params?.aggregator) searchParams.set('aggregator', params.aggregator);
    if (params?.promoCode) searchParams.set('promoCode', params.promoCode);
    if (params?.searchQuery) searchParams.set('searchQuery', params.searchQuery);
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
    const query = searchParams.toString();
    return this.request(`/bookings/filters-meta${query ? `?${query}` : ''}`);
  }

  async getBookingsTablePreferences(): Promise<BookingTablePreferences> {
    return this.request('/user-preferences/bookings-table');
  }

  async updateBookingsTablePreferences(payload: BookingTablePreferences) {
    return this.request('/user-preferences/bookings-table', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
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

  async importBookings(content: string): Promise<BookingImportResult> {
    return this.request('/bookings/import', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async getBlacklistEntries(): Promise<BlacklistEntry[]> {
    return this.request('/blacklist');
  }

  async createBlacklistEntry(payload: BlacklistEntryUpsert): Promise<BlacklistEntry> {
    return this.request('/blacklist', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateBlacklistEntry(id: string, payload: BlacklistEntryUpsert) {
    return this.request(`/blacklist/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteBlacklistEntry(id: string) {
    return this.request(`/blacklist/${id}`, {
      method: 'DELETE',
    });
  }

  async checkBlacklist(phone?: string | null, email?: string | null): Promise<BlacklistMatch[]> {
    return this.request('/blacklist/check', {
      method: 'POST',
      body: JSON.stringify({ phone, email }),
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

  // Tea zones
  async getTeaZones(active?: boolean): Promise<TeaZone[]> {
    const params = active !== undefined ? `?active=${active}` : '';
    return this.request(`/teazones${params}`);
  }

  async createTeaZone(teaZone: TeaZoneUpsert): Promise<TeaZone> {
    return this.request('/teazones', {
      method: 'POST',
      body: JSON.stringify(teaZone),
    });
  }

  async updateTeaZone(id: string, teaZone: TeaZoneUpsert) {
    return this.request(`/teazones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teaZone),
    });
  }

  async deleteTeaZone(id: string) {
    return this.request(`/teazones/${id}`, {
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

  async deleteCertificateOrder(id: string) {
    return this.request(`/certificateorders/${id}`, {
      method: 'DELETE',
    });
  }

  // Promo codes
  async getPromoCodes(): Promise<PromoCode[]> {
    return this.request('/promocodes');
  }

  async createPromoCode(data: PromoCodeUpsert): Promise<PromoCode> {
    return this.request('/promocodes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePromoCode(id: string, data: PromoCodeUpsert) {
    return this.request(`/promocodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePromoCode(id: string) {
    return this.request(`/promocodes/${id}`, {
      method: 'DELETE',
    });
  }

  // Production calendar
  async getProductionCalendar(from?: string, to?: string): Promise<ProductionCalendarDay[]> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const query = params.toString();
    return this.request(`/productioncalendar${query ? `?${query}` : ''}`);
  }

  async createProductionCalendarDay(data: ProductionCalendarDayUpsert) {
    return this.request('/productioncalendar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProductionCalendarDay(id: string, data: ProductionCalendarDayUpsert) {
    return this.request(`/productioncalendar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProductionCalendarDay(id: string) {
    return this.request(`/productioncalendar/${id}`, {
      method: 'DELETE',
    });
  }

  async importProductionCalendar(sourceUrl: string) {
    return this.request('/productioncalendar/import', {
      method: 'POST',
      body: JSON.stringify({ sourceUrl }),
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

  async sendTestEmail(): Promise<{ message: string }> {
    return this.request('/settings/test-email', {
      method: 'POST',
    });
  }

  async sendTestEmailToRecipient(email: string): Promise<{ message: string }> {
    return this.request('/settings/test-email-recipient', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async createDatabaseBackup(): Promise<{ blob: Blob; fileName: string }> {
    const options: RequestInit = {
      method: 'POST',
    };
    const response = await fetch(`${API_URL}/settings/backup`, {
      ...options,
      headers: buildAuthHeaders(options),
    });

    if (!response.ok) {
      const rawText = await response.text();
      let parsedError: unknown = null;

      if (rawText) {
        try {
          parsedError = JSON.parse(rawText);
        } catch {
          parsedError = null;
        }
      }

      if (typeof parsedError === 'string') {
        throw new Error(parsedError);
      }

      if (parsedError && typeof parsedError === 'object') {
        const message = (parsedError as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          throw new Error(message);
        }
      }

      throw new Error(rawText || `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition') || '';
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    const fileName = utf8Match
      ? decodeURIComponent(utf8Match[1])
      : asciiMatch
        ? asciiMatch[1]
        : 'questroom.backup';

    return { blob, fileName };
  }
}

export const api = new ApiClient();
