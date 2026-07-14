"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  useRouter,
} from "next/navigation";
import DashboardOverview from "./components/DashboardOverview";
import TransactionSection from "./components/TransactionSection";
import MonthlyComparison from "./components/MonthlyComparison";
import ManagementSection from "./components/ManagementSection";
import styles from "./FinanceDashboard.module.css";

const TABS = [
  {
    key: "dashboard",
    label: "ダッシュボード",
  },
  {
    key: "comparison",
    label: "月別比較",
  },
  {
    key: "management",
    label: "管理",
  },
];

export default function FinanceDashboard({
  household,
  profile,
  members,
  categories,
  transactions,
  recurringTransactions,
  settings,
  summary,
  selectedMonth,
  currentPeriodKey,
  activeTab,
  selectedPeriod,
  defaultTransactionDate,
  previousMonth,
  nextMonth,
  monthlyGoal,
  categoryChartDataByScope,
  monthlyBreakdownByScope,
}) {
  const router =
    useRouter();

  const ensuredPeriodRef =
    useRef("");

  const [
    editingTransaction,
    setEditingTransaction,
  ] = useState(null);

  const [
    isTransactionModalOpen,
    setIsTransactionModalOpen,
  ] = useState(false);

  const [
    isNavigating,
    startNavigation,
  ] = useTransition();

  useEffect(() => {
    if (
      ensuredPeriodRef.current ===
      selectedMonth
    ) {
      return;
    }

    ensuredPeriodRef.current =
      selectedMonth;

    const controller =
      new AbortController();

    async function ensureRecurring() {
      try {
        const response =
          await fetch(
            "/api/recurring/ensure",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  monthKey:
                    selectedMonth,
                }),

              signal:
                controller.signal,
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          console.error(
            "固定収支の反映エラー:",
            result?.error
          );

          return;
        }

        if (
          Number(
            result?.inserted
          ) > 0
        ) {
          router.refresh();
        }
      } catch (error) {
        if (
          error?.name ===
          "AbortError"
        ) {
          return;
        }

        console.error(
          "固定収支の通信エラー:",
          error
        );
      }
    }

    ensureRecurring();

    return () => {
      controller.abort();
    };
  }, [
    selectedMonth,
    router,
  ]);

  function createUrl({
    month =
      selectedMonth,
    tab =
      activeTab,
  }) {
    const params =
      new URLSearchParams({
        month,
        tab,
      });

    return `/dashboard?${params.toString()}`;
  }

  function navigateTo(url) {
    startNavigation(() => {
      router.push(
        url,
        {
          scroll: false,
        }
      );
    });
  }

  function changeMonth(
    month
  ) {
    if (
      !month ||
      isNavigating
    ) {
      return;
    }

    setEditingTransaction(
      null
    );

    setIsTransactionModalOpen(
      false
    );

    navigateTo(
      createUrl({
        month,
      })
    );
  }

  function changeTab(tab) {
    if (
      !tab ||
      tab === activeTab ||
      isNavigating
    ) {
      return;
    }

    setEditingTransaction(
      null
    );

    setIsTransactionModalOpen(
      false
    );

    navigateTo(
      createUrl({
        tab,
      })
    );
  }

  function openNewTransaction() {
    setEditingTransaction(
      null
    );

    setIsTransactionModalOpen(
      true
    );
  }

  function startTransactionEdit(
    transaction
  ) {
    setEditingTransaction(
      transaction
    );

    setIsTransactionModalOpen(
      true
    );
  }

  function closeTransactionModal() {
    setIsTransactionModalOpen(
      false
    );

    setEditingTransaction(
      null
    );
  }

  return (
    <>
      {isNavigating && (
        <div
          className={
            styles.navigationProgress
          }
          role="progressbar"
          aria-label="ページを読み込み中"
          aria-valuetext="読み込み中"
        >
          <span />
        </div>
      )}

      <nav
        className={
          styles.tabBar
        }
        aria-busy={
          isNavigating
        }
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={[
              styles.tabButton,
              activeTab === tab.key
                ? styles.tabButtonActive
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={
              isNavigating
            }
            onClick={() =>
              changeTab(
                tab.key
              )
            }
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section
        className={
          styles.monthToolbar
        }
        aria-busy={
          isNavigating
        }
      >
        <button
          type="button"
          className={
            styles.monthArrow
          }
          disabled={
            isNavigating
          }
          onClick={() =>
            changeMonth(
              previousMonth
            )
          }
          aria-label="前の期間"
        >
          ‹
        </button>

        <label
          className={
            styles.monthPicker
          }
        >

          <input
            type="month"
            value={
              selectedMonth
            }
            min="2000-01"
            max="2100-12"
            disabled={
              isNavigating
            }
            onChange={(
              event
            ) => {
              if (
                event.target.value
              ) {
                changeMonth(
                  event.target.value
                );
              }
            }}
          />
        </label>

        <div
          className={
            styles.monthTitle
          }
        >
          <span>
            {
              selectedPeriod
                .rangeLabel
            }
          </span>
        </div>

        <button
          type="button"
          className={
            styles.currentButton
          }
          disabled={
            isNavigating ||
            selectedMonth ===
              currentPeriodKey
          }
          onClick={() =>
            changeMonth(
              currentPeriodKey
            )
          }
        >
          今月
        </button>

        <button
          type="button"
          className={
            styles.monthArrow
          }
          disabled={
            isNavigating
          }
          onClick={() =>
            changeMonth(
              nextMonth
            )
          }
          aria-label="次の期間"
        >
          ›
        </button>
      </section>

      {activeTab ===
        "dashboard" && (
        <>
          <DashboardOverview
            members={members}
            transactions={
              transactions
            }
            summary={summary}
            selectedPeriod={
              selectedPeriod
            }
            categoryChartDataByScope={
              categoryChartDataByScope
            }
          />

          <TransactionSection
            editingTransaction={
              editingTransaction
            }
            categories={
              categories
            }
            members={members}
            currentUserId={
              profile.id
            }
            transactions={
              transactions
            }
            selectedMonth={
              selectedMonth
            }
            selectedPeriod={
              selectedPeriod
            }
            defaultTransactionDate={
              defaultTransactionDate
            }
            isEditorOpen={
              isTransactionModalOpen
            }
            onEdit={
              startTransactionEdit
            }
            onCloseEditor={
              closeTransactionModal
            }
          />

          <button
            type="button"
            className={
              styles.addTransactionButton
            }
            onClick={
              openNewTransaction
            }
            aria-label="家計簿を追加"
            title="家計簿を追加"
          >
            <span
              aria-hidden="true"
            >
              ＋
            </span>
          </button>
        </>
      )}

      {activeTab ===
        "comparison" && (
        <MonthlyComparison
          members={members}
          selectedMonth={
            selectedMonth
          }
          monthlyBreakdownByScope={
            monthlyBreakdownByScope
          }
          onMonthChange={
            changeMonth
          }
        />
      )}

      {activeTab ===
        "management" && (
        <ManagementSection
          household={
            household
          }
          profile={profile}
          members={members}
          categories={
            categories
          }
          recurringTransactions={
            recurringTransactions
          }
          settings={settings}
          selectedMonth={
            selectedMonth
          }
          selectedPeriod={
            selectedPeriod
          }
          monthlyGoal={
            monthlyGoal
          }
        />
      )}
    </>
  );
}