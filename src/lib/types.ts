export type Quest = {
  id: string;
  title: string;
  description: string;
  slug: string;
  addresses: string[];
  phones: string[];
  participantsMin: number;
  participantsMax: number;
  ageRestriction: string;
  ageRating: string;
  price: number;
  duration: number;
  difficulty: number;
  isNew: boolean;
  isVisible: boolean;
  mainImage: string | null;
  images: string[];
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
};

export type QuestUpsert = Omit<Quest, 'id' | 'createdAt' | 'updatedAt' | 'slug'>;

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
  address: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  updatedAt: string;
};

export type SettingsUpdate = Omit<Settings, 'id' | 'updatedAt'>;

export type Booking = {
  id: string;
  questId: string | null;
  questScheduleId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  bookingDate: string;
  participantsCount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookingCreate = Omit<
  Booking,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

export type BookingUpdate = Pick<Booking, 'status' | 'notes'>;

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
  createdAt: string;
  updatedAt: string;
};

export type CertificateOrderCreate = Omit<
  CertificateOrder,
  'id' | 'status' | 'createdAt' | 'updatedAt'
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
