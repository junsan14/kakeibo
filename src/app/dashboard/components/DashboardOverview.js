"use client";

import {
  useState,
} from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  formatMoney,
  getScopeOptions,
} from "../lib/dashboardHelpers";
import styles from "./DashboardOverview.module.css";

function CategoryTooltip({
  active,
  payload,
  total,
}) {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  const item =
    payload[0]?.payload;

  if (!item) {
    return null;
  }

  const percentage =
    total > 0
      ? (
          (
            item.amount /
            total
          ) *
          100
        ).toFixed(1)
      : "0.0";

  return (
    <div
      className={
        styles.chartTooltip
      }
    >
      <strong>
        {item.icon}{" "}
        {item.name}
      </strong>

      <p>
        {formatMoney(
          item.amount
        )}
      </p>

      <small>
        全体の
        {percentage}%
      </small>
    </div>
  );
}

function BudgetSummary({
  summary,
  selectedPeriod,
}) {
  const progressWidth =
    Math.min(
      summary.usedPercentage,
      100
    );

  return (
    <>
      <section
        className={
          styles.summaryGrid
        }
      >
        <article
          className={
            styles.summaryCard
          }
        >
          <span>
            {selectedPeriod.label}
            の収入
          </span>

          <strong
            className={
              styles.incomeAmount
            }
          >
            {formatMoney(
              summary.income
            )}
          </strong>

          <small>
            固定収入
            {formatMoney(
              summary.fixedIncome
            )}
            を含む
          </small>
        </article>

        <article
          className={
            styles.summaryCard
          }
        >
          <span>
            {selectedPeriod.label}
            の支出
          </span>

          <strong
            className={
              styles.expenseAmount
            }
          >
            {formatMoney(
              summary.expense
            )}
          </strong>

          <small>
            共有・個人すべての支出
          </small>
        </article>

        <article
          className={
            styles.summaryCard
          }
        >
          <span>
            今月の貯金目標
          </span>

          <strong
            className={
              styles.goalAmount
            }
          >
            {formatMoney(
              summary.savingsGoal
            )}
          </strong>

          <small>
            収入から先に確保する金額
          </small>
        </article>

        <article
          className={[
            styles.summaryCard,
            styles.availableCard,
          ].join(" ")}
        >
          <span>
            あと使える金額
          </span>

          <strong
            className={
              summary.available < 0
                ? styles.expenseAmount
                : styles.availableAmount
            }
          >
            {formatMoney(
              summary.available
            )}
          </strong>

          <small>
            収入 − 全支出 − 貯金目標
          </small>
        </article>
      </section>

      <section
        className={
          styles.budgetStatus
        }
      >
        <div
          className={
            styles.budgetHeader
          }
        >
          <div>
            <p
              className={
                styles.eyebrow
              }
            >
              BUDGET STATUS
            </p>

            <h2>
              今期の使用状況
            </h2>

            <span>
              {selectedPeriod.rangeLabel}
            </span>
          </div>

          <div
            className={
              styles.budgetPercentage
            }
          >
            <strong>
              {summary.usedPercentage}
              %
            </strong>

            <span>
              使用済み
            </span>
          </div>
        </div>

        <div
          className={
            styles.progressTrack
          }
        >
          <span
            className={
              summary.usedPercentage >
              100
                ? styles.progressOver
                : styles.progressBar
            }
            style={{
              width:
                `${progressWidth}%`,
            }}
          />
        </div>

        <div
          className={
            styles.budgetStats
          }
        >
          <div>
            <span>
              使える予算
            </span>

            <strong>
              {formatMoney(
                summary.spendingBudget
              )}
            </strong>
          </div>

          <div>
            <span>
              残り日数
            </span>

            <strong>
              {summary.remainingDays}
              日
            </strong>
          </div>

          <div>
            <span>
              1日あたりの目安
            </span>

            <strong>
              {formatMoney(
                summary.dailyAvailable
              )}
            </strong>
          </div>

          <div>
            <span>
              登録件数
            </span>

            <strong>
              {summary.count}
              件
            </strong>
          </div>
        </div>

        {summary.available < 0 && (
          <div
            className={
              styles.budgetWarning
            }
          >
            貯金目標を確保すると、
            {formatMoney(
              Math.abs(
                summary.available
              )
            )}
            の予算超過です。
          </div>
        )}
      </section>
    </>
  );
}

function CategoryBreakdown({
  members,
  selectedPeriod,
  categoryChartDataByScope,
}) {
  const scopeOptions =
    getScopeOptions(members);

  const [
    selectedScope,
    setSelectedScope,
  ] = useState("shared");

  const chartData =
    categoryChartDataByScope[
      selectedScope
    ] ?? [];

  const total =
    chartData.reduce(
      (sum, item) =>
        sum +
        Number(item.amount),
      0
    );

  const activeScope =
    scopeOptions.find(
      (option) =>
        option.key ===
        selectedScope
    );

  return (
    <section
      className={
        styles.breakdownPanel
      }
    >
      <div
        className={
          styles.panelHeader
        }
      >
        <div>
          <p
            className={
              styles.eyebrow
            }
          >
            BREAKDOWN
          </p>

          <h2>
            支出の内訳
          </h2>

          <span>
            {selectedPeriod.label}
            の
            {activeScope?.label}
          </span>
        </div>
      </div>

      <div
        className={
          styles.scopeTabs
        }
      >
        {scopeOptions.map(
          (option) => (
            <button
              key={option.key}
              type="button"
              className={[
                styles.scopeButton,
                selectedScope ===
                option.key
                  ? styles.scopeButtonActive
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                setSelectedScope(
                  option.key
                )
              }
            >
              {option.label}
            </button>
          )
        )}
      </div>

      {chartData.length ===
      0 ? (
        <div
          className={
            styles.emptyChart
          }
        >
          <span>
            🍩
          </span>

          <strong>
            支出データがありません
          </strong>

          <p>
            この区分で支出を登録すると表示されます。
          </p>
        </div>
      ) : (
        <div
          className={
            styles.pieLayout
          }
        >
          <div
            className={
              styles.pieChart
            }
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius="56%"
                  outerRadius="80%"
                  paddingAngle={3}
                  cornerRadius={4}
                  stroke="none"
                >
                  {chartData.map(
                    (item) => (
                      <Cell
                        key={item.id}
                        fill={
                          item.color
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip
                  content={
                    <CategoryTooltip
                      total={total}
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>

            <div
              className={
                styles.pieCenter
              }
            >
              <span>
                支出合計
              </span>

              <strong>
                {formatMoney(total)}
              </strong>
            </div>
          </div>

          <div
            className={
              styles.pieLegend
            }
          >
            {chartData.map(
              (item) => {
                const percentage =
                  total > 0
                    ? (
                        (
                          item.amount /
                          total
                        ) *
                        100
                      ).toFixed(1)
                    : "0.0";

                return (
                  <div
                    key={item.id}
                    className={
                      styles.legendItem
                    }
                  >
                    <span
                      className={
                        styles.legendColor
                      }
                      style={{
                        backgroundColor:
                          item.color,
                      }}
                    />

                    <div>
                      <strong>
                        {item.icon}{" "}
                        {item.name}
                      </strong>

                      <small>
                        {percentage}%
                      </small>
                    </div>

                    <b>
                      {formatMoney(
                        item.amount
                      )}
                    </b>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function SettlementAccordion({
  members,
  transactions,
  selectedPeriod,
}) {
  const sharedExpenses =
    transactions.filter(
      (transaction) =>
        transaction
          .transaction_type ===
          "expense" &&
        (
          transaction
            .allocation_scope ??
          "shared"
        ) === "shared"
    );

  const totalSharedExpense =
    sharedExpenses.reduce(
      (sum, transaction) =>
        sum +
        Number(
          transaction.amount
        ),
      0
    );

  const memberPayments =
    members.map((member) => {
      const displayName =
        member.profile
          ?.display_name ??
        "ユーザー";

      const paidAmount =
        sharedExpenses
          .filter(
            (transaction) =>
              transaction
                .paid_by_user_id ===
              member.user_id
          )
          .reduce(
            (sum, transaction) =>
              sum +
              Number(
                transaction.amount
              ),
            0
          );

      return {
        userId:
          member.user_id,

        displayName,
        paidAmount,
      };
    });

  const perPerson =
    memberPayments.length > 0
      ? totalSharedExpense /
        memberPayments.length
      : 0;

  let settlement = null;

  if (
    memberPayments.length === 2
  ) {
    const sorted = [
      ...memberPayments,
    ].sort(
      (first, second) =>
        first.paidAmount -
        second.paidAmount
    );

    const from = sorted[0];
    const to = sorted[1];

    const difference =
      to.paidAmount -
      from.paidAmount;

    const amount =
      Math.round(
        difference / 2
      );

    if (amount > 0) {
      settlement = {
        from,
        to,
        difference,
        amount,
      };
    }
  }

  return (
    <details
      className={
        styles.settlementAccordion
      }
    >
      <summary
        className={
          styles.settlementSummary
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            SETTLEMENT
          </span>

          <strong>
            二人の支払い精算
          </strong>

          <small>
            {selectedPeriod.label}
            ・共有支出のみ
          </small>
        </div>

        <div
          className={
            styles.settlementResult
          }
        >
          {memberPayments.length <
          2 ? (
            <span>
              メンバー参加待ち
            </span>
          ) : settlement ? (
            <>
              <small>
                {
                  settlement.from
                    .displayName
                }
                さんから
              </small>

              <strong>
                {formatMoney(
                  settlement.amount
                )}
              </strong>

              <small>
                {
                  settlement.to
                    .displayName
                }
                さんへ
              </small>
            </>
          ) : (
            <>
              <strong>
                精算なし
              </strong>

              <small>
                負担額は同じです
              </small>
            </>
          )}
        </div>
      </summary>

      <div
        className={
          styles.settlementContent
        }
      >
        <div
          className={
            styles.paymentGrid
          }
        >
          {memberPayments.map(
            (member) => {
              const difference =
                member.paidAmount -
                perPerson;

              return (
                <article
                  key={
                    member.userId
                  }
                  className={
                    styles.paymentCard
                  }
                >
                  <strong>
                    {
                      member.displayName
                    }
                  </strong>

                  <span>
                    共有分として支払った金額
                  </span>

                  <b>
                    {formatMoney(
                      member.paidAmount
                    )}
                  </b>

                  <small>
                    一人分との差：
                    {difference >= 0
                      ? "+"
                      : ""}
                    {formatMoney(
                      difference
                    )}
                  </small>
                </article>
              );
            }
          )}
        </div>

        <div
          className={
            styles.settlementCalculation
          }
        >
          <span>
            共有支出
            {formatMoney(
              totalSharedExpense
            )}
          </span>

          <i>
            ÷
          </i>

          <span>
            {memberPayments.length}
            人
          </span>

          <i>
            ＝
          </i>

          <strong>
            一人
            {formatMoney(
              perPerson
            )}
          </strong>
        </div>

        {settlement && (
          <div
            className={
              styles.transferBox
            }
          >
            <span>
              精算金額
            </span>

            <strong>
              {
                settlement.from
                  .displayName
              }
              さんから
              {
                settlement.to
                  .displayName
              }
              さんへ
              {formatMoney(
                settlement.amount
              )}
            </strong>

            <small>
              支払額の差
              {formatMoney(
                settlement.difference
              )}
              を2で割った金額です。
            </small>
          </div>
        )}

        <p
          className={
            styles.settlementNote
          }
        >
          個人購入と収入は精算に含みません。個人購入は支出合計・残予算・貯金目標の計算には含まれます。
        </p>
      </div>
    </details>
  );
}

export default function DashboardOverview({
  members,
  transactions,
  summary,
  selectedPeriod,
  categoryChartDataByScope,
}) {
  return (
    <>
      <BudgetSummary
        summary={summary}
        selectedPeriod={
          selectedPeriod
        }
      />

      <CategoryBreakdown
        members={members}
        selectedPeriod={
          selectedPeriod
        }
        categoryChartDataByScope={
          categoryChartDataByScope
        }
      />

      <SettlementAccordion
        members={members}
        transactions={
          transactions
        }
        selectedPeriod={
          selectedPeriod
        }
      />
    </>
  );
}