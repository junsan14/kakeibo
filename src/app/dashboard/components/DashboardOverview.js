"use client";

import { useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  formatDate,
  formatMoney,
  getScopeOptions,
  getTransactionScopeKey,
} from "../lib/dashboardHelpers";
import styles from "./DashboardOverview.module.css";


function getTransactionDateParts(
  dateValue
) {
  const date = new Date(
    `${dateValue}T00:00:00.000Z`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      monthDay: dateValue,
      weekday: "",
    };
  }

  return {
    monthDay:
      new Intl.DateTimeFormat(
        "ja-JP",
        {
          month: "numeric",
          day: "numeric",
          timeZone: "UTC",
        }
      ).format(date),

    weekday:
      new Intl.DateTimeFormat(
        "ja-JP",
        {
          weekday: "short",
          timeZone: "UTC",
        }
      ).format(date),
  };
}

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
            Number(item.amount) /
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
        全体の{percentage}%
      </small>
    </div>
  );
}

function BudgetSummary({
  summary,
  selectedPeriod,
}) {
  const usedPercentage =
    Number(
      summary.usedPercentage
    ) || 0;

  const progressWidth =
    Math.min(
      Math.max(
        usedPercentage,
        0
      ),
      100
    );

  const isOverBudget =
    summary.available < 0;

  return (
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
            今月の使用状況
          </h2>

          <span>
            {
              selectedPeriod
                .rangeLabel
            }
          </span>
        </div>

        <div
          className={
            styles.budgetPercentage
          }
        >
          <strong>
            {usedPercentage}%
          </strong>

          <span>
            使用済み
          </span>
        </div>
      </div>

      <div
        className={
          styles.progressValues
        }
      >
        <div>
          <span>
            現在の支出
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
        </div>

        <div>
          <span>
            使用できる予算
          </span>

          <strong>
            {formatMoney(
              summary.spendingBudget
            )}
          </strong>
        </div>
      </div>

      <div
        className={
          styles.progressTrack
        }
        aria-label={`予算の${usedPercentage}%を使用`}
      >
        <span
          className={
            usedPercentage > 100
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
          styles.progressFooter
        }
      >
        <span>
          {usedPercentage}%
          使用済み
        </span>

        <strong
          className={
            isOverBudget
              ? styles.remainingAmountOver
              : styles.remainingAmount
          }
        >
          あと使用できる金額{" "}
          {formatMoney(
            summary.available
          )}
        </strong>
      </div>

      <div
        className={
          styles.budgetStats
        }
      >
        <details
          className={
            styles.budgetAccordion
          }
        >
          <summary>
            <div>
              <span>
                今月使える予算
              </span>

              <strong>
                {formatMoney(
                  summary.spendingBudget
                )}
              </strong>
            </div>

            <small>
              内訳を見る
            </small>
          </summary>

          <div
            className={
              styles.budgetAccordionContent
            }
          >
            <div>
              <span>
                今月の収入
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
            </div>

            <div>
              <span>
                貯金目標
              </span>

              <strong
                className={
                  styles.goalAmount
                }
              >
                -
                {formatMoney(
                  summary.savingsGoal
                )}
              </strong>
            </div>

            <p>
              収入 − 貯金目標 ＝
              今月使える予算
            </p>
          </div>
        </details>

        <div
          className={
            styles.budgetStatCard
          }
        >
          <span>
            残り日数
          </span>

          <strong>
            {summary.remainingDays}
            日
          </strong>

          <small>
            この家計期間の残り
          </small>
        </div>

        <div
          className={
            styles.budgetStatCard
          }
        >
          <span>
            1日あたりの目安
          </span>

          <strong>
            {formatMoney(
              summary.dailyAvailable
            )}
          </strong>

          <small>
            残り予算から算出
          </small>
        </div>
      </div>

      {isOverBudget && (
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
  );
}

function CategoryBreakdown({
  members,
  transactions,
  selectedPeriod,
  categoryChartDataByScope,
}) {
  const scopeOptions =
    getScopeOptions(members);

  const [
    selectedScope,
    setSelectedScope,
  ] = useState("shared");

  const [
    hoveredPieIndex,
    setHoveredPieIndex,
  ] = useState(null);

  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] = useState(null);

  const [
    isCategoryOpen,
    setIsCategoryOpen,
  ] = useState(false);

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

  const selectedCategory =
    chartData.find(
      (item) =>
        item.id ===
        selectedCategoryId
    );

  const categoryTransactions =
    selectedCategory
      ? transactions
          .filter(
            (transaction) => {
              return (
                transaction
                  .transaction_type ===
                  "expense" &&
                transaction
                  .category_id ===
                  selectedCategory.id &&
                getTransactionScopeKey(
                  transaction
                ) === selectedScope
              );
            }
          )
          .sort(
            (
              first,
              second
            ) => {
              const dateComparison =
                String(
                  second
                    .transaction_date
                ).localeCompare(
                  String(
                    first
                      .transaction_date
                  )
                );

              if (
                dateComparison !== 0
              ) {
                return dateComparison;
              }

              return String(
                second.created_at ??
                  ""
              ).localeCompare(
                String(
                  first.created_at ??
                    ""
                )
              );
            }
          )
      : [];

  function changeScope(
    scopeKey
  ) {
    setSelectedScope(
      scopeKey
    );

    setHoveredPieIndex(
      null
    );

    setSelectedCategoryId(
      null
    );

    setIsCategoryOpen(
      false
    );
  }

  function selectCategory(
    categoryId
  ) {
    if (
      selectedCategoryId ===
      categoryId
    ) {
      setIsCategoryOpen(
        (current) =>
          !current
      );

      return;
    }

    setSelectedCategoryId(
      categoryId
    );

    setIsCategoryOpen(
      true
    );
  }

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
                changeScope(
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
        <>
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
                    data={
                      chartData
                    }
                    dataKey="amount"
                    nameKey="name"
                    innerRadius="56%"
                    outerRadius="80%"
                    paddingAngle={3}
                    cornerRadius={4}
                    stroke="none"
                    onMouseEnter={(
                      _,
                      index
                    ) => {
                      setHoveredPieIndex(
                        index
                      );
                    }}
                    onMouseLeave={() => {
                      setHoveredPieIndex(
                        null
                      );
                    }}
                  >
                    {chartData.map(
                      (item) => (
                        <Cell
                          key={
                            item.id
                          }
                          fill={
                            item.color
                          }
                          opacity={
                            selectedCategoryId &&
                            selectedCategoryId !==
                              item.id
                              ? 0.42
                              : 1
                          }
                          className={
                            styles.pieCell
                          }
                          onClick={() =>
                            selectCategory(
                              item.id
                            )
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip
                    cursor={false}
                    offset={18}
                    wrapperStyle={{
                      zIndex: 20,
                      pointerEvents:
                        "none",
                    }}
                    content={
                      <CategoryTooltip
                        total={total}
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>

              <div
                className={[
                  styles.pieCenter,
                  hoveredPieIndex !==
                  null
                    ? styles.pieCenterHidden
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span>
                  支出合計
                </span>

                <strong>
                  {formatMoney(
                    total
                  )}
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
                            Number(
                              item.amount
                            ) /
                            total
                          ) *
                          100
                        ).toFixed(
                          1
                        )
                      : "0.0";

                  const isSelected =
                    selectedCategoryId ===
                    item.id;

                  return (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      className={[
                        styles.legendItem,
                        isSelected
                          ? styles.legendItemSelected
                          : "",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(" ")}
                      onClick={() =>
                        selectCategory(
                          item.id
                        )
                      }
                      aria-expanded={
                        isSelected &&
                        isCategoryOpen
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
                          {percentage}
                          %
                        </small>
                      </div>

                      <b>
                        {formatMoney(
                          item.amount
                        )}
                      </b>

                      <i
                        aria-hidden="true"
                      >
                        {isSelected &&
                        isCategoryOpen
                          ? "−"
                          : "＋"}
                      </i>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {selectedCategory && (
            <div
              className={
                styles.categoryAccordion
              }
            >
              <button
                type="button"
                className={
                  styles.categoryAccordionSummary
                }
                onClick={() =>
                  setIsCategoryOpen(
                    (current) =>
                      !current
                  )
                }
                aria-expanded={
                  isCategoryOpen
                }
              >
                <div>
                  <span
                    className={
                      styles.categoryAccordionIcon
                    }
                    style={{
                      backgroundColor:
                        `${selectedCategory.color}18`,
                    }}
                  >
                    {
                      selectedCategory
                        .icon
                    }
                  </span>

                  <div>
                    <strong>
                      {
                        selectedCategory
                          .name
                      }
                      の詳細
                    </strong>

                    <small>
                      {
                        selectedPeriod
                          .label
                      }
                      ・
                      {
                        activeScope
                          ?.label
                      }
                      ・
                      {
                        categoryTransactions
                          .length
                      }
                      件
                    </small>
                  </div>
                </div>

                <div
                  className={
                    styles.categoryAccordionAmount
                  }
                >
                  <strong>
                    {formatMoney(
                      selectedCategory
                        .amount
                    )}
                  </strong>

                  <span
                    aria-hidden="true"
                  >
                    {isCategoryOpen
                      ? "−"
                      : "＋"}
                  </span>
                </div>
              </button>

              {isCategoryOpen && (
                <div
                  className={
                    styles.categoryAccordionContent
                  }
                >
                  {categoryTransactions
                    .length ===
                  0 ? (
                    <div
                      className={
                        styles.categoryEmpty
                      }
                    >
                      詳細データがありません。
                    </div>
                  ) : (
                    <div
                      className={
                        styles.categoryTransactionList
                      }
                    >
                      {categoryTransactions.map(
                        (transaction) => {
                          const dateParts =
                            getTransactionDateParts(
                              transaction
                                .transaction_date
                            );

                          return (
                            <article
                              key={
                                transaction.id
                              }
                              className={
                                styles.categoryTransactionItem
                              }
                            >
                              <div
                                className={
                                  styles.categoryTransactionDate
                                }
                              >
                                <strong>
                                  {dateParts.monthDay}
                                </strong>

                                {dateParts.weekday && (
                                  <span>
                                    （
                                    {dateParts.weekday}
                                    ）
                                  </span>
                                )}
                              </div>

                              <div
                                className={
                                  styles.categoryTransactionBody
                                }
                              >
                                <span
                                  className={
                                    styles.categoryTransactionPayerIcon
                                  }
                                  title={`支払者：${
                                    transaction.paid_by
                                      ?.display_name ??
                                    "ユーザー"
                                  }`}
                                  aria-label={`支払者：${
                                    transaction.paid_by
                                      ?.display_name ??
                                    "ユーザー"
                                  }`}
                                >
                                  {(
                                    transaction.paid_by
                                      ?.display_name ??
                                    "ユ"
                                  )
                                    .trim()
                                    .slice(0, 1)}
                                </span>

                                <div
                                  className={
                                    styles.categoryTransactionTitle
                                  }
                                >
                                  <strong>
                                    {transaction.title}
                                  </strong>

                                  {transaction
                                    .recurring_group_id && (
                                    <span>
                                      固定
                                    </span>
                                  )}
                                </div>
                              </div>

                              <strong
                                className={
                                  styles.categoryTransactionAmount
                                }
                              >
                                -
                                {formatMoney(
                                  transaction.amount
                                )}
                              </strong>
                
                            </article>
                            
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
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
      (
        sum,
        transaction
      ) =>
        sum +
        Number(
          transaction.amount
        ),
      0
    );

  const memberPayments =
    members.map(
      (member) => {
        const displayName =
          member.profile
            ?.display_name ??
          "ユーザー";

        const paidAmount =
          sharedExpenses
            .filter(
              (
                transaction
              ) =>
                transaction
                  .paid_by_user_id ===
                member.user_id
            )
            .reduce(
              (
                sum,
                transaction
              ) =>
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
      }
    );

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
      (
        first,
        second
      ) =>
        first.paidAmount -
        second.paidAmount
    );

    const from =
      sorted[0];

    const to =
      sorted[1];

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
            共有支出{" "}
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
            一人{" "}
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
        transactions={
          transactions
        }
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