/** نقش شغلی پرسنل — حالا متن آزاد (قابل ویرایش از تنظیمات) */
export type EmployeeRole = string;

/** سمت‌های پیش‌فرض (قابل گسترش از تنظیمات) */
export const DEFAULT_ROLES: { value: string; label: string }[] = [
  { value: 'manager', label: 'مدیر' },
  { value: 'chef', label: 'سرآشپز' },
  { value: 'cook', label: 'آشپز' },
  { value: 'waiter', label: 'گارسون' },
  { value: 'cashier', label: 'صندوق‌دار' },
  { value: 'dishwasher', label: 'ظرفشور' },
  { value: 'delivery', label: 'پیک' },
  { value: 'cleaner', label: 'نظافتچی' },
  { value: 'other', label: 'سایر' },
];

export type Gender = 'male' | 'female' | 'other';
export type MaritalStatus = 'single' | 'married' | 'other';
export type InsuranceStatus = 'insured' | 'uninsured' | 'pending' | 'exempt';

export interface Employee {
  id: string;
  fullName: string;
  nationalId: string | null;
  phone: string;
  role: EmployeeRole;
  branchId: string | null;
  branchName: string | null;
  fatherName: string | null;
  gender: Gender | null;
  maritalStatus: MaritalStatus | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  iban: string | null;
  bankAccount: string | null;
  insuranceStatus: InsuranceStatus;
  insuranceNumber: string | null;
  healthCardNumber: string | null;
  healthCardExpiryDate: string | null; // ISO date
  joinDate: string;                     // ISO date
  terminationDate: string | null;
  baseMonthlySalary: number;            // تومان
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const EMPLOYEE_ROLE_LABELS: Record<string, string> = {
  manager: 'مدیر', chef: 'سرآشپز', cook: 'آشپز', waiter: 'گارسون',
  cashier: 'صندوق‌دار', dishwasher: 'ظرفشور', delivery: 'پیک',
  cleaner: 'نظافتچی', other: 'سایر',
};

export const INSURANCE_STATUS_LABELS: Record<InsuranceStatus, string> = {
  insured: 'بیمه', uninsured: 'بدون بیمه', pending: 'در انتظار', exempt: 'معاف',
};
