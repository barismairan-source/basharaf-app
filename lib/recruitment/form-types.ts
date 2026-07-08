export type FormFieldType =
  | 'text' | 'textarea' | 'number' | 'tel' | 'email'
  | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'date';

export type FormFieldScope = 'all' | 'kitchen' | 'hall';
export type FormFieldWidth = 'full' | 'half';
export type ConditionOperator = 'equals' | 'not_equals' | 'includes' | 'is_empty' | 'is_not_empty';
export type ConditionAction = 'show' | 'hide' | 'require';

export interface FormFieldOptionData {
  id: string;
  fieldId: string;
  label: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
}

export interface FormFieldConditionData {
  id: string;
  fieldId: string;
  dependsOnFieldId: string;
  operator: ConditionOperator;
  value: string | null;
  action: ConditionAction;
}

export interface FormFieldData {
  id: string;
  sectionId: string;
  key: string;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  type: FormFieldType;
  isRequired: boolean;
  isActive: boolean;
  isSystem: boolean;
  isFilterable: boolean;
  sortOrder: number;
  scope: FormFieldScope;
  validation: {
    regex?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  } | null;
  defaultValue: string | null;
  width: FormFieldWidth;
  options: FormFieldOptionData[];
  conditions: FormFieldConditionData[];
}

export interface FormSectionData {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  fields: FormFieldData[];
}

export interface FormStructure {
  sections: FormSectionData[];
}

/** اطلاعات snapshot فیلد برای رکوردهای قدیمی */
export interface FieldSnapshot {
  key: string;
  label: string;
  type: FormFieldType;
}

/** نوع فیلدهایی که نیاز به گزینه دارند */
export const OPTION_FIELD_TYPES: FormFieldType[] = ['select', 'multiselect', 'radio', 'checkbox'];

/** فیلدهای سیستمی که به ستون اختصاصی job_applications نگاشت می‌شوند */
export const SYSTEM_FIELD_COLUMN_MAP: Record<string, string> = {
  first_name: 'firstName',
  last_name: 'lastName',
  phone: 'phone',
  age: 'age',
  gender: 'gender',
  city: 'city',
  shift_availability: 'shiftAvailability',
  start_availability: 'startAvailability',
  referral_source: 'referralSource',
};

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'متن کوتاه',
  textarea: 'متن بلند',
  number: 'عدد',
  tel: 'شماره تلفن',
  email: 'ایمیل',
  select: 'انتخاب تکی (dropdown)',
  multiselect: 'انتخاب چندگانه (chips)',
  radio: 'انتخاب تکی (radio)',
  checkbox: 'چک‌باکس',
  date: 'تاریخ',
};

export const SCOPE_LABELS: Record<FormFieldScope, string> = {
  all: 'همه',
  kitchen: 'فقط آشپزخانه',
  hall: 'فقط سالن',
};

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: 'برابر است با',
  not_equals: 'برابر نیست با',
  includes: 'شامل است',
  is_empty: 'خالی است',
  is_not_empty: 'خالی نیست',
};

export const ACTION_LABELS: Record<ConditionAction, string> = {
  show: 'نمایش بده',
  hide: 'مخفی کن',
  require: 'اجباری کن',
};

/** ارزیابی آیا یک فیلد باید نمایش داده شود و اجباری باشد */
export function evaluateFieldVisibility(
  field: FormFieldData,
  allValues: Record<string, unknown>
): { visible: boolean; required: boolean } {
  if (!field.isActive) return { visible: false, required: false };
  if (field.conditions.length === 0) {
    return { visible: true, required: field.isRequired };
  }

  let visible = true;
  let required = field.isRequired;

  for (const cond of field.conditions) {
    const depValue = allValues[cond.dependsOnFieldId] ?? allValues['__key__' + cond.dependsOnFieldId];
    const met = evaluateOperator(cond.operator, depValue, cond.value);
    if (met) {
      if (cond.action === 'show')    visible = true;
      if (cond.action === 'hide')    visible = false;
      if (cond.action === 'require') required = true;
    }
  }

  return { visible, required };
}

function evaluateOperator(
  operator: ConditionOperator,
  fieldValue: unknown,
  condValue: string | null
): boolean {
  const v = String(fieldValue ?? '');
  switch (operator) {
    case 'equals':       return v === (condValue ?? '');
    case 'not_equals':   return v !== (condValue ?? '');
    case 'includes':     return Array.isArray(fieldValue)
                           ? (fieldValue as string[]).includes(condValue ?? '')
                           : v.includes(condValue ?? '');
    case 'is_empty':     return !fieldValue || v === '' || (Array.isArray(fieldValue) && (fieldValue as unknown[]).length === 0);
    case 'is_not_empty': return !!fieldValue && v !== '' && !(Array.isArray(fieldValue) && (fieldValue as unknown[]).length === 0);
    default:             return false;
  }
}
