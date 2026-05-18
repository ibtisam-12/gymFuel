export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const otpPattern = /^\d{6}$/;
export const namePattern = /^[A-Za-z][A-Za-z\s'.-]{2,49}$/;

export const toNumber = (value: string) => Number(value.trim());

export const isValidEmail = (value: string) => emailPattern.test(value.trim().toLowerCase());

export const isValidOtp = (value: string) => otpPattern.test(value.trim());

export const isStrongPassword = (value: string) =>
  /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);

export const isInRange = (value: string, min: number, max: number) => {
  const parsed = toNumber(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max;
};

export const isNonEmptyText = (value: string, min = 1, max = 100) => {
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= max;
};

export const onlyDigits = (value: string) => value.replace(/[^\d]/g, '');

export const decimalInput = (value: string) =>
  value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
