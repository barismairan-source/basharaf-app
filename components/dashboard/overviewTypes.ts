/**
 * شکل پاسخ `/api/dashboard/overview` — یک منبع مشترک برای هر سه مصرف‌کننده
 * (AttentionWidget، HRSummaryCard، OperationalQueues) که همه از یک fetch در
 * سطح صفحه تغذیه می‌شوند، نه هرکدام fetch مستقل خودشان (که همان درخواست
 * تکراری بود که این بازطراحی باید حذف کند).
 */
export interface DashboardOverviewData {
  inventory: { lowStockCount: number; pendingVouchers: number };
  finance: { pendingTransactions: number };
  hr: {
    activeEmployees: number;
    latestPayrollRun: { periodYearMonth: string; status: string; branchName: string | null } | null;
  };
  operations: { openPoCount: number; equipmentInRepairCount: number; todayIncompleteTasks: number };
}
