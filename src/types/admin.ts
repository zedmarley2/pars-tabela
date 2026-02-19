import { z } from 'zod';

// ---------------------------------------------------------------------------
// Category Schemas
// ---------------------------------------------------------------------------

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be 100 characters or fewer')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description must be 500 characters or fewer').optional(),
  order: z.number().int().min(0).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ---------------------------------------------------------------------------
// Product Schemas
// ---------------------------------------------------------------------------

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or fewer'),
  description: z.string().max(5000, 'Description must be 5000 characters or fewer').optional(),
  price: z.number().positive('Price must be positive').optional(),
  categoryId: z.string().uuid('Invalid category ID'),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export const updateProductSchema = createProductSchema.partial();

// ---------------------------------------------------------------------------
// Product Image Schema
// ---------------------------------------------------------------------------

export const createProductImageSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  alt: z.string().max(255).optional(),
  order: z.number().int().min(0).optional(),
});

// ---------------------------------------------------------------------------
// Contact Form Schema
// ---------------------------------------------------------------------------

export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional(),
  message: z.string().min(1, 'Message is required').max(2000),
  productId: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Quote Schemas
// ---------------------------------------------------------------------------

export const createQuoteSchema = z.object({
  customerName: z.string().min(1, 'Ad soyad zorunludur').max(100),
  customerEmail: z.string().email('Geçerli bir e-posta adresi giriniz'),
  customerPhone: z.string().max(20).optional(),
  customerCompany: z.string().max(200).optional(),
  productType: z.string().max(100).optional(),
  description: z.string().min(1, 'Açıklama zorunludur').max(5000),
  dimensions: z.string().max(200).optional(),
  productId: z.string().uuid().optional(),
});

export const quoteItemSchema = z.object({
  name: z.string().min(1, 'Kalem adı zorunludur').max(200),
  quantity: z.number().int().min(1, 'Miktar en az 1 olmalıdır'),
  unitPrice: z.number().min(0, 'Birim fiyat 0 veya daha büyük olmalıdır'),
});

export const updateQuoteSchema = z.object({
  status: z
    .enum([
      'NEW',
      'QUOTE_PREPARED',
      'QUOTE_SENT',
      'APPROVED',
      'IN_PRODUCTION',
      'READY_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ])
    .optional(),
  items: z.array(quoteItemSchema).optional(),
  estimatedDays: z.number().int().min(1).optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  customerNotes: z.string().max(5000).optional().nullable(),
  cancellationReason: z.string().max(2000).optional().nullable(),
  deliveryDate: z.string().datetime().optional().nullable(),
});

export const createQuoteNoteSchema = z.object({
  content: z.string().min(1, 'Not içeriği zorunludur').max(5000),
});

// ---------------------------------------------------------------------------
// Auto Update Schemas
// ---------------------------------------------------------------------------

export const updateCheckSchema = z.object({
  repoUrl: z.string().url('Geçerli bir GitHub URL giriniz'),
  branch: z.string().min(1, 'Branch seçimi zorunludur').max(100),
});

export const updateExecuteSchema = z.object({
  repoUrl: z.string().url('Geçerli bir GitHub URL giriniz'),
  branch: z.string().min(1, 'Branch seçimi zorunludur').max(100),
  password: z.string().min(1, 'Şifre zorunludur'),
});

export const rollbackSchema = z.object({
  backupId: z.string().uuid('Geçersiz yedek ID'),
  password: z.string().min(1, 'Şifre zorunludur'),
});

// ---------------------------------------------------------------------------
// Inferred Types
// ---------------------------------------------------------------------------

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateProductImageInput = z.infer<typeof createProductImageSchema>;
export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type CreateQuoteNoteInput = z.infer<typeof createQuoteNoteSchema>;
export type UpdateCheckInput = z.infer<typeof updateCheckSchema>;
export type UpdateExecuteInput = z.infer<typeof updateExecuteSchema>;
export type RollbackInput = z.infer<typeof rollbackSchema>;
