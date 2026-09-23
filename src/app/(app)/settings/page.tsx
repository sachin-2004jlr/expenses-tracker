import type { Metadata } from "next";
import Link from "next/link";
import { Database, Palette, Repeat, Settings2, Tags, Target, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { AccountSettings } from "@/features/settings/account-settings";
import { NavPending } from "@/components/layout/nav-pending";
import { AppearanceSettings } from "@/features/settings/appearance-settings";
import { BudgetManager } from "@/features/settings/budget-manager";
import { CategoryManager } from "@/features/settings/category-manager";
import { DataManagement } from "@/features/settings/data-management";
import { GeneralSettings } from "@/features/settings/general-settings";
import { RecurringManager } from "@/features/settings/recurring-manager";
import { getCategoryTotals } from "@/lib/analytics/queries";
import { getCurrentUser } from "@/lib/auth";
import { formatMonthLabel, monthRange } from "@/lib/dates";
import { loadAppContext } from "@/lib/services/bootstrap";
import { listBudgets } from "@/lib/services/budgets";
import { listCategoriesWithStats } from "@/lib/services/categories";
import { listRecurring } from "@/lib/services/recurring";
import { countTransactions } from "@/lib/services/transactions";
import { getUserProfile } from "@/lib/services/user-identity";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

const TABS = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "account", label: "Account", icon: UserRound },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "budgets", label: "Budgets", icon: Target },
  { id: "recurring", label: "Recurring", icon: Repeat },
  { id: "data", label: "Data", icon: Database },
  { id: "appearance", label: "Appearance", icon: Palette },
] as const;

type TabId = (typeof TABS)[number]["id"];

function parseTab(value: string | string[] | undefined): TabId {
  const candidate = Array.isArray(value) ? value[0] : value;
  return TABS.some((t) => t.id === candidate) ? (candidate as TabId) : "general";
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const context = await loadAppContext();

  let panel: React.ReactNode;
  switch (tab) {
    case "account": {
      const [sessionUser, profile] = await Promise.all([getCurrentUser(), getUserProfile(context.userId)]);
      const user = {
        id: context.userId,
        name: profile?.name ?? sessionUser?.name ?? null,
        email: profile?.email ?? sessionUser?.email ?? null,
        image: profile?.image ?? sessionUser?.image ?? null,
      };
      panel = <AccountSettings user={user} />;
      break;
    }
    case "categories": {
      const categories = await listCategoriesWithStats(context.userId);
      panel = <CategoryManager categories={categories} />;
      break;
    }
    case "budgets": {
      const { start, end } = monthRange(context.currentMonth);
      const [budgets, spending] = await Promise.all([listBudgets(context.userId), getCategoryTotals(context.userId, "EXPENSE", start, end)]);
      panel = (
        <BudgetManager
          categories={context.categories.filter((c) => c.type === "EXPENSE")}
          budgets={budgets}
          spent={Object.fromEntries(spending.map((row) => [row.categoryId, row.amount]))}
          monthLabel={formatMonthLabel(context.currentMonth)}
        />
      );
      break;
    }
    case "recurring": {
      const rules = await listRecurring(context.userId);
      panel = <RecurringManager rules={rules} categories={context.categories} today={context.today} dateFormat={context.settings.dateFormat} />;
      break;
    }
    case "data": {
      const total = await countTransactions(context.userId);
      panel = <DataManagement transactionCount={total} />;
      break;
    }
    case "appearance":
      panel = <AppearanceSettings />;
      break;
    case "general":
    default:
      panel = <GeneralSettings settings={context.settings} today={context.today} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Preferences, account, categories, budgets, recurring rules and your data." />
      <div className="grid gap-5 lg:grid-cols-[13rem_1fr]">
        <nav aria-label="Settings sections" className="-mx-1 overflow-x-auto lg:mx-0">
          <ul className="flex gap-1 px-1 lg:flex-col">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = item.id === tab;
              return (
                <li key={item.id}>
                  <Link
                    href={`/settings?tab=${item.id}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      active ? "bg-brand/12 text-brand" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {item.label}
                    <NavPending className="inset-0 rounded-lg bg-brand/10 ring-1 ring-brand/40" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0">{panel}</div>
      </div>
    </div>
  );
}
