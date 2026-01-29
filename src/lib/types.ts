export type Quest = {
  id: string;
  title: string;
  description: string;
  slug: string;
  addresses: string[];
  phones: string[];
  participantsMin: number;
  participantsMax: number;
  extraParticipantsMax: number;
  extraParticipantPrice: number;
  ageRestriction: string;
  ageRating: string;
  price: number;
  duration: number;
  difficulty: number;
  difficultyMax: number;
  isNew: boolean;
  isVisible: boolean;
  mainImage: string | null;
  images: string[];
  giftGameLabel: string | null;
  giftGameUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
  extraServices: QuestExtraService[];
};

export type QuestUpsert = Omit<
  Quest,
  'id' | 'createdAt' | 'updatedAt' | 'slug' | 'extraServices'
> & {
  extraServices: QuestExtraServiceUpsert[];
};

export type DurationBadge = {
  id: string;
  duration: number;
  label: string;
  badgeImageUrl: string | null;
  createdAt: string;
};

export type Settings = {
  id: string;
  vkUrl: string | null;
  youtubeUrl: string | null;
  instagramUrl: string | null;
  telegramUrl: string | null;
  vkIconUrl: string | null;
  vkIconColor: string | null;
  vkIconBackground: string | null;
  youtubeIconUrl: string | null;
  youtubeIconColor: string | null;
  youtubeIconBackground: string | null;
  instagramIconUrl: string | null;
  instagramIconColor: string | null;
  instagramIconBackground: string | null;
  telegramIconUrl: string | null;
  telegramIconColor: string | null;
  telegramIconBackground: string | null;
  address: string | null;
  email: string | null;
  notificationEmail: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpUseSsl: boolean;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  notifyBookingAdmin: boolean;
  notifyBookingCustomer: boolean;
  bookingEmailTemplateAdmin: string | null;
  bookingEmailTemplateCustomer: string | null;
  notifyCertificateAdmin: boolean;
  notifyCertificateCustomer: boolean;
  certificateEmailTemplateAdmin: string | null;
  certificateEmailTemplateCustomer: string | null;
  phone: string | null;
  logoUrl: string | null;
  certificatePageTitle: string | null;
  certificatePageDescription: string | null;
  certificatePagePricing: string | null;
  reviewsMode: string | null;
  reviewsFlampEmbed: string | null;
  bookingStatusPlannedColor: string | null;
  bookingStatusCreatedColor: string | null;
  bookingStatusPendingColor: string | null;
  bookingStatusNotConfirmedColor: string | null;
  bookingStatusConfirmedColor: string | null;
  bookingStatusCompletedColor: string | null;
  bookingStatusCancelledColor: string | null;
  bookingDaysAhead: number;
  bookingCutoffMinutes: number;
  timeZone: string | null;
  promotionsPerRow: number | null;
  videoModalEnabled: boolean;
  backgroundGradientFrom: string | null;
  backgroundGradientVia: string | null;
  backgroundGradientTo: string | null;
  updatedAt: string;
};

export type SettingsUpdate = Omit<Settings, 'id' | 'updatedAt'>;

export type Booking = {
  id: string;
  questId: string | null;
  questScheduleId: string | null;
  aggregator: string | null;
  questTitle?: string | null;
  questPrice?: number | null;
  extraParticipantPrice?: number | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  bookingDate: string;
  participantsCount: number;
  extraParticipantsCount: number;
  totalPrice: number;
  paymentType: string;
  promoCode: string | null;
  promoDiscountType: string | null;
  promoDiscountValue: number | null;
  promoDiscountAmount: number | null;
  status:
    | 'pending'
    | 'confirmed'
    | 'cancelled'
    | 'completed'
    | 'planned'
    | 'created'
    | 'not_confirmed';
  notes: string | null;
  extraServices: BookingExtraService[];
  createdAt: string;
  updatedAt: string;
};

export type BookingCreate = {
  questId: string | null;
  questScheduleId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  bookingDate: string;
  participantsCount: number;
  notes: string | null;
  extraServiceIds: string[];
  paymentType?: string | null;
  promoCode?: string | null;
};

export type BookingUpdate = Partial<
  Pick<
    Booking,
    | 'status'
    | 'notes'
    | 'customerName'
    | 'customerPhone'
    | 'customerEmail'
    | 'participantsCount'
    | 'extraParticipantsCount'
    | 'bookingDate'
    | 'totalPrice'
    | 'paymentType'
    | 'promoCode'
    | 'promoDiscountType'
    | 'promoDiscountValue'
    | 'promoDiscountAmount'
    | 'questId'
    | 'questScheduleId'
    | 'aggregator'
    | 'questTitle'
    | 'questPrice'
    | 'extraParticipantPrice'
    | 'extraServices'
  >
>;

export type QuestExtraService = {
  id: string;
  title: string;
  price: number;
};

export type QuestExtraServiceUpsert = {
  id?: string;
  title: string;
  price: number;
};

export type BookingExtraService = {
  id: string;
  title: string;
  price: number;
};

export type Rule = {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RuleUpsert = Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>;

export type AboutInfo = {
  id: string;
  title: string;
  content: string;
  mission: string;
  vision: string;
  updatedAt: string;
};

export type AboutInfoUpdate = Omit<AboutInfo, 'id' | 'updatedAt'>;

export type Certificate = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  issuedDate: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CertificateUpsert = Omit<Certificate, 'id' | 'createdAt' | 'updatedAt'>;

export type CertificateOrder = {
  id: string;
  certificateId: string;
  certificateTitle: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  status: string;
  deliveryType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CertificateOrderCreate = Omit<
  CertificateOrder,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

export type CertificateOrderUpdate = Partial<
  Pick<
    CertificateOrder,
    'customerName' | 'customerPhone' | 'customerEmail' | 'notes' | 'status' | 'deliveryType'
  >
>;

export type PromoCode = {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  discountType: string;
  discountValue: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PromoCodeUpsert = Omit<PromoCode, 'id' | 'createdAt' | 'updatedAt'>;

export type ProductionCalendarDay = {
  id: string;
  date: string;
  title: string | null;
  isHoliday: boolean;
  dayType: 'holidays' | 'preholidays' | 'nowork' | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductionCalendarDayUpsert = Omit<
  ProductionCalendarDay,
  'id' | 'createdAt' | 'updatedAt'
>;

export type Review = {
  id: string;
  customerName: string;
  questTitle: string;
  rating: number;
  reviewText: string;
  reviewDate: string;
  isVisible: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReviewUpsert = Omit<Review, 'id' | 'createdAt' | 'updatedAt'>;

export type Promotion = {
  id: string;
  title: string;
  description: string;
  discountText: string;
  imageUrl: string | null;
  displayMode: 'image' | 'text' | 'text_description';
  showTitle: boolean;
  showDescription: boolean;
  showDiscountText: boolean;
  showPeriod: boolean;
  showImage: boolean;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PromotionUpsert = Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>;

export type QuestSchedule = {
  id: string;
  questId: string;
  date: string;
  timeSlot: string;
  price: number;
  isBooked: boolean;
  bookingId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestScheduleUpsert = Omit<QuestSchedule, 'id' | 'createdAt' | 'updatedAt'>;

export type QuestWeeklySlot = {
  id: string;
  questId: string;
  dayOfWeek: number;
  timeSlot: string;
  price: number;
  createdAt: string;
  updatedAt: string;
};

export type QuestWeeklySlotUpsert = Omit<
  QuestWeeklySlot,
  'id' | 'createdAt' | 'updatedAt'
>;

export type QuestScheduleOverrideSlot = {
  id: string;
  timeSlot: string;
  price: number;
};

export type QuestScheduleOverride = {
  id: string;
  questId: string;
  date: string;
  isClosed: boolean;
  slots: QuestScheduleOverrideSlot[];
  createdAt: string;
  updatedAt: string;
};

export type QuestScheduleOverrideUpsert = {
  questId: string;
  date: string;
  isClosed: boolean;
  slots: Array<{ timeSlot: string; price: number }>;
};

export type QuestScheduleSettings = {
  id: string;
  questId: string;
  holidayPrice: number | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestScheduleSettingsUpsert = {
  questId: string;
  holidayPrice: number | null;
};

export type QuestPricingRule = {
  id: string;
  questIds: string[];
  title: string;
  startDate: string | null;
  endDate: string | null;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  price: number;
  isBlocked: boolean;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QuestPricingRuleUpsert = Omit<
  QuestPricingRule,
  'id' | 'createdAt' | 'updatedAt'
>;

export type ScheduleGenerateRequest = {
  questId?: string | null;
  fromDate: string;
  toDate: string;
};

export type ImageAsset = {
  id: string;
  fileName: string;
  contentType: string;
  url: string;
  createdAt: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'blocked' | 'pending';
  roleId: string;
  roleName: string;
  createdAt: string;
  lastLoginAt?: string | null;
  notes?: string | null;
};

export type AdminUserUpsert = {
  name: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'blocked' | 'pending';
  roleId: string;
  notes?: string | null;
  password?: string | null;
};

export type RoleDefinition = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PermissionGroup = {
  id: string;
  title: string;
  description: string;
  permissions: { id: string; title: string; description: string }[];
};
