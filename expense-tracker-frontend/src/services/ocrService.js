import api from '../api/axios';

export const extractAmountFromImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/expenses/extract-amount', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw error;
  }
};

export const formatExtractedAmount = (amount, locale = 'en') => {
  if (typeof amount === 'number') {
    if (locale === 'vi') {
      // Vietnamese format: 123.456,78
      return amount.toLocaleString('de-DE');
    } else {
      // English format: 123,456.78
      return amount.toLocaleString('en-US');
    }
  }
  return amount?.toString() || '';
};