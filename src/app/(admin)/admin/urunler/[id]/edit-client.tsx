'use client';

import { ProductFormPage } from '@/components/admin/product-form-page';
import type { ProductFormInitialData } from '@/components/admin/product-form-page';

interface EditProductClientProps {
  initialData: ProductFormInitialData;
}

export function EditProductClient({ initialData }: EditProductClientProps) {
  return <ProductFormPage initialData={initialData} isEditing={true} />;
}
