/**
 * Barrel — همه atoms را از یک نقطه import کنید:
 *
 *   import { Button, Card, DataList, Sheet, StatusPill } from '@/components/ui';
 */

export { Avatar, extractInitials, type AvatarProps } from './Avatar';
export { BrandMark, type BrandMarkProps } from './BrandMark';
export { Button, type ButtonProps } from './Button';
export {
  Card,
  CardHeader,
  CardBody,
  type CardProps,
  type CardHeaderProps,
} from './Card';
export { Checkbox, type CheckboxProps } from './Checkbox';
export { ConfirmProvider, useConfirm, type ConfirmOptions } from './ConfirmDialog';
export { Chip, type ChipProps } from './Chip';
export { DataList, type DataListProps, type DataListColumn } from './DataList';
export { Dot, type DotProps } from './Dot';
export { Empty, type EmptyProps } from './Empty';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { Field, type FieldProps } from './Field';
export { Input, type InputProps } from './Input';
export { JalaliDatePicker } from './JalaliDatePicker';
export { Label, type LabelProps } from './Label';
export { MetricCard, type MetricCardProps } from './MetricCard';
export { PasswordInput, type PasswordInputProps } from './PasswordInput';
export {
  SegFilter,
  type SegFilterOption,
  type SegFilterProps,
} from './SegFilter';
export { Select, type SelectProps } from './Select';
export { Sheet, type SheetProps } from './Sheet';
export { Sparkline, type SparklineProps } from './Sparkline';
export { StatusPill, type StatusPillProps } from './StatusPill';
export { Switch, type SwitchProps } from './Switch';
export {
  Th,
  Td,
  TableContainer,
  type ThProps,
  type TdProps,
} from './Table';
export { Textarea, type TextareaProps } from './Textarea';
export {
  Toast,
  type ToastData,
  type ToastTone,
  type ToastProps,
} from './Toast';
export { Toggle, type ToggleOption, type ToggleProps } from './Toggle';
export { PageHeader, type PageHeaderProps } from './PageHeader';
export { IconButton, type IconButtonProps } from './IconButton';
export { ButtonLink, type ButtonLinkProps } from './ButtonLink';
export { Skeleton } from './Skeleton';
export { ThemeProvider, ACCENT_PRESETS } from './ThemeProvider';
