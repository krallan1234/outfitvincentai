import { useState } from 'react';
import { PurchaseLink, PurchaseLinkSchema } from '@/types/outfit';

export const usePurchaseLinks = () => {
  const [purchaseLinks, setPurchaseLinks] = useState<Array<Partial<PurchaseLink> & { store_name: string }>>([
    { store_name: '', price: '', url: '' },
  ]);

  const addPurchaseLink = (): void => {
    setPurchaseLinks([...purchaseLinks, { store_name: '', price: '', url: '' }]);
  };

  const removePurchaseLink = (index: number): void => {
    if (purchaseLinks.length > 1) {
      setPurchaseLinks(purchaseLinks.filter((_, i) => i !== index));
    }
  };

  const updatePurchaseLink = (
    index: number,
    field: keyof PurchaseLink,
    value: string
  ): void => {
    const updated = [...purchaseLinks];
    updated[index] = { ...updated[index], [field]: value };
    
    try {
      // Validate the updated link
      PurchaseLinkSchema.parse(updated[index]);
      setPurchaseLinks(updated);
    } catch (error) {
      // If validation fails, still update but log the error
      console.warn('Invalid purchase link format:', error);
      setPurchaseLinks(updated);
    }
  };

  const getValidPurchaseLinks = (): Array<{ store_name: string; price?: string; url?: string }> => {
    return purchaseLinks
      .filter((link) => link.store_name.trim() !== '')
      .map(link => ({
        store_name: link.store_name,
        price: link.price,
        url: link.url,
      }));
  };

  const resetPurchaseLinks = (): void => {
    setPurchaseLinks([{ store_name: '', price: '', url: '' }]);
  };

  return {
    purchaseLinks,
    addPurchaseLink,
    removePurchaseLink,
    updatePurchaseLink,
    getValidPurchaseLinks,
    resetPurchaseLinks,
  };
};
