import {
  redirect,
} from "next/navigation";
import {
  createClient,
} from "@/lib/supabase/server";
import {
  logoutAction,
} from "@/app/auth/actions";
import {
  createHouseholdAction,
  joinHouseholdAction,
} from "./actions";
import {
  createCategoryDataKey,
} from "./lib/dashboardHelpers";
import FinanceDashboard from "./FinanceDashboard";
import styles from "./page.module.css";

export const metadata = {
  title: "ホーム",
};

export const dynamic =
  "force-dynamic";

const DEFAULT_TIME_ZONE =
  "Asia/Tokyo";

const DAY_MILLISECONDS =
  24 * 60 * 60 * 1000;

const VALID_TABS = [
  "dashboard",
  "comparison",
  "management",
];

function normalizeTab(value) {
  if (
    VALID_TABS.includes(value)
  ) {
    return value;
  }

  return "dashboard";
}

function isValidMonthKey(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(
      value
    )
  );
}

function formatMonthKey(
  year,
  month
) {
  return [
    year,
    String(month).padStart(
      2,
      "0"
    ),
  ].join("-");
}

function addMonths(
  monthKey,
  amount
) {
  const [year, month] =
    monthKey
      .split("-")
      .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1 + amount,
      1
    )
  );

  return formatMonthKey(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1
  );
}

function getZonedDateParts(
  date,
  timeZone
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  return {
    year: Number(
      parts.find(
        (part) =>
          part.type === "year"
      )?.value
    ),

    month: Number(
      parts.find(
        (part) =>
          part.type === "month"
      )?.value
    ),

    day: Number(
      parts.find(
        (part) =>
          part.type === "day"
      )?.value
    ),
  };
}

function getCurrentPeriodKey(
  cycleStartDay,
  timeZone
) {
  const today =
    getZonedDateParts(
      new Date(),
      timeZone
    );

  const calendarMonth =
    formatMonthKey(
      today.year,
      today.month
    );

  if (
    today.day >= cycleStartDay
  ) {
    return calendarMonth;
  }

  return addMonths(
    calendarMonth,
    -1
  );
}

function dateToValue(date) {
  return date
    .toISOString()
    .slice(0, 10);
}

function formatJapaneseDate(date) {
  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }
  ).format(date);
}

function getPeriodRange(
  periodKey,
  cycleStartDay
) {
  const [year, month] =
    periodKey
      .split("-")
      .map(Number);

  const startDate = new Date(
    Date.UTC(
      year,
      month - 1,
      cycleStartDay
    )
  );

  const endDate = new Date(
    Date.UTC(
      year,
      month,
      cycleStartDay
    )
  );

  const endInclusive =
    new Date(
      endDate.getTime() -
        DAY_MILLISECONDS
    );

  return {
    start:
      dateToValue(startDate),

    endExclusive:
      dateToValue(endDate),

    endInclusive:
      dateToValue(
        endInclusive
      ),

    startDate,
    endDate,

    label:
      `${year}年${month}月期`,

    rangeLabel:
      `${formatJapaneseDate(
        startDate
      )}〜${formatJapaneseDate(
        endInclusive
      )}`,
  };
}

function getPeriodKeyForDate(
  dateValue,
  cycleStartDay
) {
  const [
    year,
    month,
    day,
  ] = dateValue
    .split("-")
    .map(Number);

  const calendarMonth =
    formatMonthKey(
      year,
      month
    );

  if (
    day >= cycleStartDay
  ) {
    return calendarMonth;
  }

  return addMonths(
    calendarMonth,
    -1
  );
}

function getTodayDateValue(
  timeZone
) {
  const today =
    getZonedDateParts(
      new Date(),
      timeZone
    );

  return [
    today.year,
    String(
      today.month
    ).padStart(2, "0"),
    String(
      today.day
    ).padStart(2, "0"),
  ].join("-");
}

function getRemainingDays({
  range,
  timeZone,
}) {
  const todayValue =
    getTodayDateValue(
      timeZone
    );

  const todayDate =
    new Date(
      `${todayValue}T00:00:00.000Z`
    );

  if (
    todayDate <
    range.startDate
  ) {
    return Math.ceil(
      (
        range.endDate -
        range.startDate
      ) /
        DAY_MILLISECONDS
    );
  }

  if (
    todayDate >=
    range.endDate
  ) {
    return 0;
  }

  return Math.ceil(
    (
      range.endDate -
      todayDate
    ) /
      DAY_MILLISECONDS
  );
}

function createPeriodKeys(
  lastPeriod,
  count
) {
  return Array.from(
    {
      length: count,
    },
    (_, index) =>
      addMonths(
        lastPeriod,
        index - (count - 1)
      )
  );
}

function getRowScopeKey(row) {
  if (
    row.allocation_scope ===
      "personal" &&
    row.personal_owner_user_id
  ) {
    return (
      row.personal_owner_user_id
    );
  }

  return "shared";
}

function selectEffectiveRecurringVersions(
  rows
) {
  const versionMap =
    new Map();

  for (const row of rows) {
    if (
      versionMap.has(
        row.recurring_group_id
      )
    ) {
      continue;
    }

    versionMap.set(
      row.recurring_group_id,
      row
    );
  }

  return Array.from(
    versionMap.values()
  );
}

function buildCategoryChartDataByScope({
  rows,
  members,
  categoryMap,
}) {
  const scopeKeys = [
    "shared",
    ...members.map(
      (member) =>
        member.user_id
    ),
  ];

  const scopeMaps =
    new Map(
      scopeKeys.map(
        (scopeKey) => [
          scopeKey,
          new Map(),
        ]
      )
    );

  rows
    .filter(
      (row) =>
        row.transaction_type ===
        "expense"
    )
    .forEach((row) => {
      const scopeKey =
        getRowScopeKey(row);

      const categoryTotals =
        scopeMaps.get(
          scopeKey
        );

      if (!categoryTotals) {
        return;
      }

      const category =
        categoryMap.get(
          row.category_id
        );

      const current =
        categoryTotals.get(
          row.category_id
        );

      if (current) {
        current.amount +=
          Number(row.amount);

        return;
      }

      categoryTotals.set(
        row.category_id,
        {
          id:
            row.category_id,

          name:
            category?.name ??
            "未分類",

          icon:
            category?.icon ??
            "🏷️",

          color:
            category?.color ??
            "#64748B",

          amount:
            Number(row.amount),
        }
      );
    });

  return Object.fromEntries(
    Array.from(
      scopeMaps.entries()
    ).map(
      ([
        scopeKey,
        categoryTotals,
      ]) => [
        scopeKey,

        Array.from(
          categoryTotals.values()
        ).sort(
          (first, second) =>
            second.amount -
            first.amount
        ),
      ]
    )
  );
}

function buildMonthlyBreakdownByScope({
  rows,
  members,
  periodKeys,
  categoryMap,
  cycleStartDay,
}) {
  const scopeKeys = [
    "shared",
    ...members.map(
      (member) =>
        member.user_id
    ),
  ];

  const scopeRows =
    new Map();

  const scopeCategories =
    new Map();

  for (
    const scopeKey of scopeKeys
  ) {
    const rowMap =
      new Map();

    for (
      const periodKey of
      periodKeys
    ) {
      const [year, month] =
        periodKey
          .split("-")
          .map(Number);

      rowMap.set(
        periodKey,
        {
          monthKey:
            periodKey,

          label:
            `${month}月`,

          fullLabel:
            `${year}年${month}月期`,

          total: 0,
        }
      );
    }

    scopeRows.set(
      scopeKey,
      rowMap
    );

    scopeCategories.set(
      scopeKey,
      new Map()
    );
  }

  for (const row of rows) {
    const scopeKey =
      getRowScopeKey(row);

    const rowMap =
      scopeRows.get(
        scopeKey
      );

    const categoryMapForScope =
      scopeCategories.get(
        scopeKey
      );

    if (
      !rowMap ||
      !categoryMapForScope
    ) {
      continue;
    }

    const periodKey =
      getPeriodKeyForDate(
        row.transaction_date,
        cycleStartDay
      );

    const targetRow =
      rowMap.get(
        periodKey
      );

    if (!targetRow) {
      continue;
    }

    const amount =
      Number(row.amount);

    const category =
      categoryMap.get(
        row.category_id
      );

    const dataKey =
      createCategoryDataKey(
        row.category_id
      );

    targetRow[dataKey] =
      Number(
        targetRow[dataKey] ??
        0
      ) + amount;

    targetRow.total +=
      amount;

    const categoryData =
      categoryMapForScope.get(
        row.category_id
      );

    if (categoryData) {
      categoryData.total +=
        amount;

      continue;
    }

    categoryMapForScope.set(
      row.category_id,
      {
        id:
          row.category_id,

        dataKey,

        name:
          category?.name ??
          "未分類",

        icon:
          category?.icon ??
          "🏷️",

        color:
          category?.color ??
          "#64748B",

        total:
          amount,
      }
    );
  }

  return Object.fromEntries(
    scopeKeys.map(
      (scopeKey) => {
        const rowsForScope =
          Array.from(
            scopeRows
              .get(scopeKey)
              .values()
          );

        const categoriesForScope =
          Array.from(
            scopeCategories
              .get(scopeKey)
              .values()
          ).sort(
            (first, second) =>
              second.total -
              first.total
          );

        return [
          scopeKey,
          {
            rows:
              rowsForScope,

            categories:
              categoriesForScope,
          },
        ];
      }
    )
  );
}

function logQueryError(
  label,
  error
) {
  if (!error) {
    return;
  }

  console.error(label, {
    code:
      error.code,

    message:
      error.message,

    details:
      error.details,

    hint:
      error.hint,
  });
}

export default async function DashboardPage({
  searchParams,
}) {
  const params =
    await searchParams;

  const requestedMonth =
    typeof params?.month ===
    "string"
      ? params.month
      : "";

  const activeTab =
    normalizeTab(
      typeof params?.tab ===
        "string"
        ? params.tab
        : ""
    );

  const pageError =
    typeof params?.error ===
    "string"
      ? params.error
      : "";

  const message =
    typeof params?.message ===
    "string"
      ? params.message
      : "";

  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData
      ?.claims
      ?.sub ??
    null;

  if (!userId) {
    redirect("/login");
  }

  const [
    profileResult,
    membershipResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, display_name"
      )
      .eq("id", userId)
      .maybeSingle(),

    supabase
      .from(
        "household_members"
      )
      .select(
        "household_id, role"
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle(),
  ]);

  logQueryError(
    "Profile query error:",
    profileResult.error
  );

  logQueryError(
    "Membership query error:",
    membershipResult.error
  );

  const profile =
    profileResult.data;

  const membership =
    membershipResult.data;

  let household = null;
  let members = [];
  let categories = [];
  let transactions = [];
  let recurringTransactions = [];

  let settings = {
    cycle_start_day: 1,
    default_savings_goal: 0,
    timezone:
      DEFAULT_TIME_ZONE,
  };

  let selectedMonth = "";
  let currentPeriodKey = "";
  let selectedPeriod = null;
  let monthlyGoal = 0;

  let categoryChartDataByScope = {
    shared: [],
  };

  let monthlyBreakdownByScope = {
    shared: {
      rows: [],
      categories: [],
    },
  };

  let summary = {
    expense: 0,
    income: 0,
    balance: 0,
    savingsGoal: 0,
    available: 0,
    remainingDays: 0,
    dailyAvailable: 0,
    spendingBudget: 0,
    usedPercentage: 0,
    count: 0,
    fixedExpense: 0,
    fixedIncome: 0,
  };

  if (
    membership?.household_id
  ) {
    const householdId =
      membership.household_id;

    const [
      householdResult,
      memberResult,
      categoryResult,
      settingsResult,
    ] = await Promise.all([
      supabase
        .from("households")
        .select(`
          id,
          name,
          currency,
          invite_code,
          created_at
        `)
        .eq(
          "id",
          householdId
        )
        .maybeSingle(),

      supabase
        .from(
          "household_members"
        )
        .select(`
          user_id,
          role,
          joined_at
        `)
        .eq(
          "household_id",
          householdId
        )
        .order(
          "joined_at",
          {
            ascending: true,
          }
        ),

      supabase
        .from("categories")
        .select(`
          id,
          household_id,
          name,
          category_type,
          icon,
          color,
          is_active,
          created_at
        `)
        .eq(
          "household_id",
          householdId
        )
        .order(
          "category_type",
          {
            ascending: true,
          }
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        ),

      supabase
        .from(
          "household_settings"
        )
        .select(`
          household_id,
          cycle_start_day,
          default_savings_goal,
          timezone
        `)
        .eq(
          "household_id",
          householdId
        )
        .maybeSingle(),
    ]);

    logQueryError(
      "Household query error:",
      householdResult.error
    );

    logQueryError(
      "Members query error:",
      memberResult.error
    );

    logQueryError(
      "Categories query error:",
      categoryResult.error
    );

    logQueryError(
      "Settings query error:",
      settingsResult.error
    );

    household =
      householdResult.data;

    categories =
      categoryResult.data ??
      [];

    settings = {
      cycle_start_day:
        settingsResult.data
          ?.cycle_start_day ??
        1,

      default_savings_goal:
        Number(
          settingsResult.data
            ?.default_savings_goal ??
            0
        ),

      timezone:
        settingsResult.data
          ?.timezone ??
        DEFAULT_TIME_ZONE,
    };

    currentPeriodKey =
      getCurrentPeriodKey(
        settings
          .cycle_start_day,
        settings.timezone
      );

    selectedMonth =
      isValidMonthKey(
        requestedMonth
      )
        ? requestedMonth
        : currentPeriodKey;

    selectedPeriod =
      getPeriodRange(
        selectedMonth,
        settings
          .cycle_start_day
      );

    const periodKeys =
      createPeriodKeys(
        selectedMonth,
        12
      );

    const firstPeriodRange =
      getPeriodRange(
        periodKeys[0],
        settings
          .cycle_start_day
      );

    const lastPeriodRange =
      getPeriodRange(
        selectedMonth,
        settings
          .cycle_start_day
      );

    const [
      transactionResult,
      comparisonResult,
      planResult,
      recurringResult,
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select(`
          id,
          household_id,
          category_id,
          title,
          amount,
          transaction_type,
          transaction_date,
          entered_by_user_id,
          paid_by_user_id,
          memo,
          recurring_transaction_id,
          recurring_group_id,
          recurrence_period_key,
          allocation_scope,
          personal_owner_user_id,
          created_at,
          updated_at
        `)
        .eq(
          "household_id",
          householdId
        )
        .gte(
          "transaction_date",
          selectedPeriod.start
        )
        .lt(
          "transaction_date",
          selectedPeriod
            .endExclusive
        )
        .order(
          "transaction_date",
          {
            ascending: false,
          }
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(500),

      supabase
        .from("transactions")
        .select(`
          amount,
          transaction_date,
          category_id,
          allocation_scope,
          personal_owner_user_id
        `)
        .eq(
          "household_id",
          householdId
        )
        .eq(
          "transaction_type",
          "expense"
        )
        .gte(
          "transaction_date",
          firstPeriodRange.start
        )
        .lt(
          "transaction_date",
          lastPeriodRange
            .endExclusive
        ),

      supabase
        .from(
          "monthly_plans"
        )
        .select(
          "savings_goal"
        )
        .eq(
          "household_id",
          householdId
        )
        .eq(
          "period_key",
          `${selectedMonth}-01`
        )
        .maybeSingle(),

      supabase
        .from(
          "recurring_transactions"
        )
        .select(`
          id,
          household_id,
          recurring_group_id,
          effective_from,
          title,
          amount,
          transaction_type,
          category_id,
          paid_by_user_id,
          due_day,
          memo,
          is_active,
          allocation_scope,
          personal_owner_user_id,
          created_at
        `)
        .eq(
          "household_id",
          householdId
        )
        .lte(
          "effective_from",
          `${selectedMonth}-01`
        )
        .order(
          "effective_from",
          {
            ascending: false,
          }
        ),
    ]);

    logQueryError(
      "Transactions query error:",
      transactionResult.error
    );

    logQueryError(
      "Comparison query error:",
      comparisonResult.error
    );

    logQueryError(
      "Monthly plan query error:",
      planResult.error
    );

    logQueryError(
      "Recurring query error:",
      recurringResult.error
    );

    monthlyGoal =
      planResult.data
        ?.savings_goal != null
        ? Number(
            planResult.data
              .savings_goal
          )
        : settings
            .default_savings_goal;

    const memberRows =
      memberResult.data ??
      [];

    const profileIds =
      memberRows.map(
        (member) =>
          member.user_id
      );

    let memberProfiles = [];

    if (
      profileIds.length > 0
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(
          "id, display_name"
        )
        .in(
          "id",
          profileIds
        );

      logQueryError(
        "Member profiles query error:",
        error
      );

      memberProfiles =
        data ?? [];
    }

    const profileMap =
      new Map(
        memberProfiles.map(
          (memberProfile) => [
            memberProfile.id,
            memberProfile,
          ]
        )
      );

    const categoryMap =
      new Map(
        categories.map(
          (category) => [
            category.id,
            category,
          ]
        )
      );

    members =
      memberRows.map(
        (member) => ({
          ...member,

          profile:
            profileMap.get(
              member.user_id
            ) ?? null,
        })
      );

    const selectedRows =
      transactionResult.data ??
      [];

    transactions =
      selectedRows.map(
        (transaction) => ({
          ...transaction,

          amount:
            Number(
              transaction.amount
            ),

          allocation_scope:
            transaction
              .allocation_scope ??
            "shared",

          category:
            categoryMap.get(
              transaction
                .category_id
            ) ?? null,

          entered_by:
            profileMap.get(
              transaction
                .entered_by_user_id
            ) ?? null,

          paid_by:
            profileMap.get(
              transaction
                .paid_by_user_id
            ) ?? null,

          personal_owner:
            profileMap.get(
              transaction
                .personal_owner_user_id
            ) ?? null,
        })
      );

    const effectiveRecurringRows =
      selectEffectiveRecurringVersions(
        recurringResult.data ??
          []
      );

    recurringTransactions =
      effectiveRecurringRows.map(
        (recurring) => ({
          ...recurring,

          amount:
            Number(
              recurring.amount
            ),

          category:
            categoryMap.get(
              recurring
                .category_id
            ) ?? null,

          paid_by:
            profileMap.get(
              recurring
                .paid_by_user_id
            ) ?? null,

          personal_owner:
            profileMap.get(
              recurring
                .personal_owner_user_id
            ) ?? null,
        })
      );

    const expense =
      selectedRows
        .filter(
          (row) =>
            row.transaction_type ===
            "expense"
        )
        .reduce(
          (total, row) =>
            total +
            Number(row.amount),
          0
        );

    const income =
      selectedRows
        .filter(
          (row) =>
            row.transaction_type ===
            "income"
        )
        .reduce(
          (total, row) =>
            total +
            Number(row.amount),
          0
        );

    const fixedExpense =
      selectedRows
        .filter(
          (row) =>
            row.transaction_type ===
              "expense" &&
            row.recurring_group_id
        )
        .reduce(
          (total, row) =>
            total +
            Number(row.amount),
          0
        );

    const fixedIncome =
      selectedRows
        .filter(
          (row) =>
            row.transaction_type ===
              "income" &&
            row.recurring_group_id
        )
        .reduce(
          (total, row) =>
            total +
            Number(row.amount),
          0
        );

    const spendingBudget =
      Math.max(
        income - monthlyGoal,
        0
      );

    const available =
      income -
      expense -
      monthlyGoal;

    const remainingDays =
      getRemainingDays({
        range:
          selectedPeriod,

        timeZone:
          settings.timezone,
      });

    const dailyAvailable =
      remainingDays > 0
        ? Math.floor(
            Math.max(
              available,
              0
            ) /
              remainingDays
          )
        : 0;

    const usedPercentage =
      spendingBudget > 0
        ? Math.min(
            Math.round(
              (
                expense /
                spendingBudget
              ) *
                100
            ),
            999
          )
        : expense > 0
          ? 100
          : 0;

    summary = {
      expense,
      income,

      balance:
        income - expense,

      savingsGoal:
        monthlyGoal,

      available,
      remainingDays,
      dailyAvailable,
      spendingBudget,
      usedPercentage,

      count:
        selectedRows.length,

      fixedExpense,
      fixedIncome,
    };

    categoryChartDataByScope =
      buildCategoryChartDataByScope({
        rows:
          selectedRows,

        members,

        categoryMap,
      });

    monthlyBreakdownByScope =
      buildMonthlyBreakdownByScope({
        rows:
          comparisonResult.data ??
          [],

        members,
        periodKeys,
        categoryMap,

        cycleStartDay:
          settings
            .cycle_start_day,
      });
  }

  const fallbackPeriod =
    selectedPeriod ?? {
      start: "",
      endInclusive: "",
      label: "",
      rangeLabel: "",
    };

  const todayValue =
    getTodayDateValue(
      settings.timezone
    );

  const defaultTransactionDate =
    selectedMonth ===
      currentPeriodKey &&
    todayValue >=
      fallbackPeriod.start &&
    todayValue <=
      fallbackPeriod
        .endInclusive
      ? todayValue
      : fallbackPeriod.start;

  return (
    <main
      className={styles.page}
    >
      <header
        className={styles.header}
      >
        <div
          className={
            styles.headerInner
          }
        >
          <div
            className={styles.brand}
          >
            <span
              className={
                styles.brandIcon
              }
            >
              ¥
            </span>

            <div>
              <p>
                二人で管理する
              </p>

              <h1>
                ふたり家計簿
              </h1>
            </div>
          </div>

          <div
            className={
              styles.userArea
            }
          >
            <span>
              {profile
                ?.display_name ??
                "ユーザー"}
            </span>

            <form
              action={logoutAction}
            >
              <button
                type="submit"
                className={
                  styles.logoutButton
                }
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>

      <div
        className={
          styles.container
        }
      >
        {pageError && (
          <div
            className={
              styles.errorMessage
            }
          >
            {pageError}
          </div>
        )}

        {message && (
          <div
            className={
              styles.successMessage
            }
          >
            {message}
          </div>
        )}

        {!household ? (
          <section
            className={
              styles.setupSection
            }
          >
            <div
              className={
                styles.welcome
              }
            >
              <span
                className={
                  styles.welcomeIcon
                }
              >
                👋
              </span>

              <div>
                <p>
                  ようこそ
                </p>

                <h2>
                  {profile
                    ?.display_name ??
                    "ユーザー"}
                  さん
                </h2>

                <span>
                  新しい家計を作るか、パートナーの家計に参加してください。
                </span>
              </div>
            </div>

            <div
              className={
                styles.setupGrid
              }
            >
              <article
                className={
                  styles.setupCard
                }
              >
                <span
                  className={
                    styles.cardIcon
                  }
                >
                  🏠
                </span>

                <h3>
                  新しい家計を作る
                </h3>

                <p>
                  最初に登録する人はこちら。作成後に招待コードが表示されます。
                </p>

                <form
                  action={
                    createHouseholdAction
                  }
                  className={
                    styles.setupForm
                  }
                >
                  <label>
                    <span>
                      家計名
                    </span>

                    <input
                      type="text"
                      name="householdName"
                      placeholder="ふたりの家計"
                      maxLength={50}
                      required
                    />
                  </label>

                  <button
                    type="submit"
                  >
                    家計を作成
                  </button>
                </form>
              </article>

              <article
                className={
                  styles.setupCard
                }
              >
                <span
                  className={
                    styles.cardIcon
                  }
                >
                  🔗
                </span>

                <h3>
                  招待コードで参加
                </h3>

                <p>
                  パートナーから受け取った8文字の招待コードを入力します。
                </p>

                <form
                  action={
                    joinHouseholdAction
                  }
                  className={
                    styles.setupForm
                  }
                >
                  <label>
                    <span>
                      招待コード
                    </span>

                    <input
                      type="text"
                      name="inviteCode"
                      placeholder="A1B2C3D4"
                      maxLength={8}
                      autoCapitalize="characters"
                      required
                    />
                  </label>

                  <button
                    type="submit"
                  >
                    家計に参加
                  </button>
                </form>
              </article>
            </div>
          </section>
        ) : (
          <FinanceDashboard
            household={household}
            profile={
              profile ?? {
                id: userId,
                display_name:
                  "ユーザー",
              }
            }
            members={members}
            categories={
              categories
            }
            transactions={
              transactions
            }
            recurringTransactions={
              recurringTransactions
            }
            settings={settings}
            summary={summary}
            selectedMonth={
              selectedMonth
            }
            currentPeriodKey={
              currentPeriodKey
            }
            activeTab={activeTab}
            selectedPeriod={
              fallbackPeriod
            }
            defaultTransactionDate={
              defaultTransactionDate
            }
            previousMonth={
              addMonths(
                selectedMonth,
                -1
              )
            }
            nextMonth={
              addMonths(
                selectedMonth,
                1
              )
            }
            monthlyGoal={
              monthlyGoal
            }
            categoryChartDataByScope={
              categoryChartDataByScope
            }
            monthlyBreakdownByScope={
              monthlyBreakdownByScope
            }
          />
        )}
      </div>
    </main>
  );
}