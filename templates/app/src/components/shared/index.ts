/**
 * Barrel for the shared component catalog.
 *
 * Import from `@/components/shared` for cross-cutting pieces. Note a barrel
 * export is NOT a usage — `jinn-web doctor` checks real call sites when it
 * hunts dead code.
 */
export {
  StatusBadge,
  type StatusTone,
  type StatusBadgeProps,
} from "./status-badge";
export { TruncatedText, type TruncatedTextProps } from "./truncated-text";
export { EmptyState, type EmptyStateProps } from "./empty-state";
export { ErrorState, type ErrorStateProps } from "./error-state";
export { ConfirmDialog, type ConfirmDialogProps } from "./confirm-dialog";
export { PageHeader, type PageHeaderProps } from "./page-header";
export { SectionHeader, type SectionHeaderProps } from "./section-header";
export { SearchInput, type SearchInputProps } from "./search-input";
export { RowActions, type RowAction } from "./row-actions";
export { RoleScreens, type RoleScreensProps } from "./role-screens";
export { FullPageLoader } from "./full-page-loader";
export { LanguageSwitcher } from "./language-switcher";
export { UserAvatar, type UserAvatarProps } from "./user-avatar";
export { AvatarStack, type AvatarStackProps } from "./avatar-stack";
export { StatCard, type StatCardProps } from "./stat-card";
export { DescriptionList, type DescriptionItem } from "./description-list";
export { CopyButton, type CopyButtonProps } from "./copy-button";
export { PasswordInput, type PasswordInputProps } from "./password-input";
export { OtpInput, type OtpInputProps } from "./otp-input";
export { PhoneInput, type PhoneInputProps } from "./phone-input";
export { FileDropzone, type FileDropzoneProps } from "./file-dropzone";
export { CommandMenu } from "./command-menu";
export { DatePicker, type DatePickerProps } from "./date-picker";
export { Combobox, type ComboboxOption, type ComboboxProps } from "./combobox";
export { MultiSelect, type MultiSelectProps } from "./multi-select";
export {
  FilterChips,
  type FilterChip,
  type FilterChipsProps,
} from "./filter-chips";
export {
  SegmentedTabs,
  type SegmentedOption,
  type SegmentedTabsProps,
} from "./segmented-tabs";
export { Stepper, type Step, type StepperProps } from "./stepper";
export { SettingsSection, SettingsRow } from "./settings-section";
export { TableSkeletonRows } from "./table-skeleton-rows";
export {
  CardSkeleton,
  StatsSkeleton,
  DetailSkeleton,
  FormSkeleton,
  ListSkeleton,
} from "./skeletons";
export {
  DataTable,
  DataTableColumnHeader,
  DataTablePagination,
  parseSort,
  buildSort,
  toggleSort,
  type DataTableProps,
} from "./data-table";
