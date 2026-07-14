"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const ensuredPeriodRef = useRef("");

  const [editingTransaction, setEditingTransaction] = useState(null);

  const [isTransactionModalOpen, setIsTransactionModalOpen] =
    useState(false);

  useEffect(() => {
    if (ensuredPeriodRef.current === selectedMonth) {
      return;
    }

    ensuredPeriodRef.current = selectedMonth;

    const controller = new AbortController();

    async function ensureRecurring() {
      try {
        const response = await fetch("/api/recurring/ensure", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            monthKey: selectedMonth,
          }),

          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok) {
          console.error(
            "固定収支の反映エラー:",
            result?.error,
          );

          return;
        }

        if (Number(result?.inserted) > 0) {
          router.refresh();
        }
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error(
          "固定収支の通信エラー:",
          error,
        );
      }
    }

    ensureRecurring();

    return () => {
      controller.abort();
    };
  }, [selectedMonth, router]);

  function createUrl({
    month = selectedMonth,
    tab = activeTab,
  }) {
    const params = new URLSearchParams({
      month,
      tab,
    });

    return `/dashboard?${params.toString()}`;
  }

  function changeMonth(month) {
    setEditingTransaction(null);
    setIsTransactionModalOpen(false);

    router.push(
      createUrl({
        month,
      }),
      {
        scroll: false,
      },
    );
  }

  function changeTab(tab) {
    setEditingTransaction(null);
    setIsTransactionModalOpen(false);

    router.push(
      createUrl({
        tab,
      }),
      {
        scroll: false,
      },
    );
  }

  function openNewTransaction() {
    setEditingTransaction(null);
    setIsTransactionModalOpen(true);
  }

  function startTransactionEdit(transaction) {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  }

  function closeTransactionModal() {
    setIsTransactionModalOpen(false);
    setEditingTransaction(null);
  }

  return (
    <>
      <nav className={styles.tabBar}>
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
            onClick={() => changeTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className={styles.monthToolbar}>
        <button
          type="button"
          className={styles.monthArrow}
          onClick={() => changeMonth(previousMonth)}
          aria-label="前の期間"
        >
          ‹
        </button>

        <label className={styles.monthPicker}>
          <span>表示する家計期間</span>

          <input
            type="month"
            value={selectedMonth}
            min="2000-01"
            max="2100-12"
            onChange={(event) => {
              if (event.target.value) {
                changeMonth(event.target.value);
              }
            }}
          />
        </label>

        <div className={styles.monthTitle}>
          <span>{selectedPeriod.label}</span>

          <strong>
            {selectedPeriod.rangeLabel}
          </strong>
        </div>

        <button
          type="button"
          className={styles.currentButton}
          disabled={
            selectedMonth === currentPeriodKey
          }
          onClick={() =>
            changeMonth(currentPeriodKey)
          }
        >
          今月
        </button>

        <button
          type="button"
          className={styles.monthArrow}
          onClick={() => changeMonth(nextMonth)}
          aria-label="次の期間"
        >
          ›
        </button>
      </section>

      {activeTab === "dashboard" && (
        <>
          <DashboardOverview
            members={members}
            transactions={transactions}
            summary={summary}
            selectedPeriod={selectedPeriod}
            categoryChartDataByScope={
              categoryChartDataByScope
            }
          />

          <TransactionSection
            editingTransaction={
              editingTransaction
            }
            categories={categories}
            members={members}
            currentUserId={profile.id}
            transactions={transactions}
            selectedMonth={selectedMonth}
            selectedPeriod={selectedPeriod}
            defaultTransactionDate={
              defaultTransactionDate
            }
            isEditorOpen={
              isTransactionModalOpen
            }
            onEdit={startTransactionEdit}
            onCloseEditor={
              closeTransactionModal
            }
          />

          <button
            type="button"
            className={
              styles.addTransactionButton
            }
            onClick={openNewTransaction}
            aria-label="家計簿を追加"
            title="家計簿を追加"
          >
            <span aria-hidden="true">
              ＋
            </span>
          </button>
        </>
      )}

      {activeTab === "comparison" && (
        <MonthlyComparison
          members={members}
          selectedMonth={selectedMonth}
          monthlyBreakdownByScope={
            monthlyBreakdownByScope
          }
          onMonthChange={changeMonth}
        />
      )}

      {activeTab === "management" && (
        <ManagementSection
          household={household}
          profile={profile}
          members={members}
          categories={categories}
          recurringTransactions={
            recurringTransactions
          }
          settings={settings}
          selectedMonth={selectedMonth}
          selectedPeriod={selectedPeriod}
          monthlyGoal={monthlyGoal}
        />
      )}
    </>
  );
}