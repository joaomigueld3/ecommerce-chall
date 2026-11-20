function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidCpf(raw) {
  const digits = onlyDigits(raw);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(digits[i]) * (10 - i);
  }
  let check1 = (sum * 10) % 11;
  if (check1 === 10) check1 = 0;
  if (check1 !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(digits[i]) * (11 - i);
  }
  let check2 = (sum * 10) % 11;
  if (check2 === 10) check2 = 0;
  return check2 === Number(digits[10]);
}

function isValidCnpj(raw) {
  const digits = onlyDigits(raw);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;

  const calcDigit = (slice, weights) => {
    const sum = slice.split('').reduce((acc, d, idx) => acc + Number(d) * weights[idx], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcDigit(digits.slice(0, 12), w1);
  const d2 = calcDigit(digits.slice(0, 13), w2);
  return d1 === Number(digits[12]) && d2 === Number(digits[13]);
}

function validateRegionalDocument(documentType, documentNumber) {
  if (!documentType && !documentNumber) {
    return { valid: true, normalized: null };
  }
  if (!documentType || !documentNumber) {
    return { valid: false, message: 'Both documentType and documentNumber are required when providing a document.' };
  }

  const trimmed = String(documentNumber).trim().toUpperCase();

  if (documentType === 'CPF') {
    if (!isValidCpf(trimmed)) {
      return { valid: false, message: 'Invalid Brazilian CPF check digits.' };
    }
    return { valid: true, normalized: onlyDigits(trimmed) };
  }

  if (documentType === 'CNPJ') {
    if (!isValidCnpj(trimmed)) {
      return { valid: false, message: 'Invalid Brazilian CNPJ check digits.' };
    }
    return { valid: true, normalized: onlyDigits(trimmed) };
  }

  if (documentType === 'TAX_ID') {
    const digits = onlyDigits(trimmed);
    if (digits.length !== 9) {
      return { valid: false, message: 'US Tax ID (SSN/EIN) must contain 9 digits.' };
    }
    return { valid: true, normalized: digits };
  }

  if (documentType === 'VAT_ID') {
    const compact = trimmed.replace(/[\s.-]/g, '');
    if (!/^[A-Z]{2}[A-Z0-9]{6,12}$/.test(compact)) {
      return { valid: false, message: 'EU VAT ID must start with a 2-letter country code followed by 6–12 alphanumeric characters.' };
    }
    return { valid: true, normalized: compact };
  }

  return { valid: false, message: `Unsupported documentType '${documentType}'.` };
}

export {
  isValidCpf,
  isValidCnpj,
  validateRegionalDocument,
};
