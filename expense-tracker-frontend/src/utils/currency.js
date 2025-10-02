export function formatAmountDisplay(raw, locale = 'en') {
  // giữ tối đa 2 số thập phân, định dạng theo locale
  // en: 123,456.78 (US format)
  // vi: 123.456,78 (Vietnamese format)
  if (raw === "" || raw == null) return "";
  
  // Convert number to string if needed
  if (typeof raw === 'number') {
    raw = raw.toString();
  }
  
  if (locale === 'vi') {
    // Vietnamese format: 123.456,78
    const cleaned = raw.replace(/[^\d.,]/g, "");
    
    // Tách phần nguyên và phần thập phân dựa trên dấu phẩy cuối cùng
    const lastCommaIndex = cleaned.lastIndexOf(',');
    let intPart, decPart;
    
    if (lastCommaIndex === -1) {
      // Không có dấu phẩy, toàn bộ là phần nguyên
      intPart = cleaned.replace(/\./g, ''); // Bỏ tất cả dấu chấm khỏi phần nguyên
      decPart = "";
    } else {
      // Có dấu phẩy, tách thành phần nguyên và thập phân
      intPart = cleaned.substring(0, lastCommaIndex).replace(/\./g, ''); // Bỏ dấu chấm khỏi phần nguyên
      decPart = cleaned.substring(lastCommaIndex + 1).replace(/[.,]/g, '').slice(0, 2); // Chỉ lấy số sau dấu phẩy cuối
    }
    
    // Bỏ số 0 đầu khỏi phần nguyên
    intPart = intPart.replace(/^0+(?=\d)/, "") || "0";
    
    // Format phần nguyên với thousand separators (dấu chấm)
    const withSep = Number(intPart).toLocaleString("de-DE"); // German locale uses . for thousands
    
    // Trả về kết quả
    if (lastCommaIndex !== -1) {
      return `${withSep},${decPart}`;
    } else {
      return withSep;
    }
  } else {
    // English format: 123,456.78
    const cleaned = raw.replace(/[^\d.,]/g, "");
    
    // Tách phần nguyên và phần thập phân dựa trên dấu chấm cuối cùng
    const lastDotIndex = cleaned.lastIndexOf('.');
    let intPart, decPart;
    
    if (lastDotIndex === -1) {
      // Không có dấu chấm, toàn bộ là phần nguyên
      intPart = cleaned.replace(/,/g, ''); // Bỏ tất cả dấu phẩy khỏi phần nguyên
      decPart = "";
    } else {
      // Có dấu chấm, tách thành phần nguyên và thập phân
      intPart = cleaned.substring(0, lastDotIndex).replace(/,/g, ''); // Bỏ dấu phẩy khỏi phần nguyên
      decPart = cleaned.substring(lastDotIndex + 1).replace(/[.,]/g, '').slice(0, 2); // Chỉ lấy số sau dấu chấm cuối
    }
    
    // Bỏ số 0 đầu khỏi phần nguyên
    intPart = intPart.replace(/^0+(?=\d)/, "") || "0";
    
    // Format phần nguyên với thousand separators (dấu phẩy)
    const withSep = Number(intPart).toLocaleString("en-US"); // US locale uses , for thousands
    
    // Trả về kết quả
    if (lastDotIndex !== -1) {
      return `${withSep}.${decPart}`;
    } else {
      return withSep;
    }
  }
}

export function parseAmountToNumber(display, locale = 'en') {
  if (!display) return NaN;
  
  if (locale === 'vi') {
    // Vietnamese format: 123.456,78 -> 123456.78
    // Bỏ dấu chấm (thousand separator), thay dấu phẩy thành dấu chấm (decimal)
    return Number(display.replace(/\./g, "").replace(/,/g, "."));
  } else {
    // English format: 123,456.78 -> 123456.78
    // Bỏ dấu phẩy (thousand separator), giữ nguyên dấu chấm (decimal)
    return Number(display.replace(/,/g, ""));
  }
}

export function getAllowedCharsRegex(locale = 'en') {
  if (locale === 'vi') {
    // Vietnamese: allow numbers, dots (thousand separator), commas (decimal separator)
    return /[0-9.,]/;
  } else {
    // English: allow numbers, commas (thousand separator), dots (decimal separator)
    return /[0-9,.]/;
  }
}

export function getPlaceholderText(locale = 'en') {
  if (locale === 'vi') {
    return "123.456,78";
  } else {
    return "123,456.78";
  }
}

/**
 * Format currency with currency symbol for export and display
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (e.g., 'VND', 'USD')
 * @param {string} locale - Locale ('en' or 'vi')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'VND', locale = 'en') {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }

  const numAmount = Number(amount);
  
  if (locale === 'vi') {
    if (currency === 'VND') {
      // Vietnamese format: 123.456₫
      const formatted = formatAmountDisplay(numAmount.toString(), 'vi');
      return `${formatted}₫`;
    }
    // Other currencies in Vietnamese locale
    const formatted = formatAmountDisplay(numAmount.toString(), 'vi');
    return `${formatted} ${currency}`;
  } else {
    if (currency === 'USD') {
      // US format: $123,456.78
      const formatted = formatAmountDisplay(numAmount.toString(), 'en');
      return `$${formatted}`;
    } else if (currency === 'VND') {
      // VND in English format: 123,456 VND
      const formatted = formatAmountDisplay(numAmount.toString(), 'en');
      return `${formatted} VND`;
    }
    // Other currencies in English locale
    const formatted = formatAmountDisplay(numAmount.toString(), 'en');
    return `${formatted} ${currency}`;
  }
}
