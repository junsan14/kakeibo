"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatCompactMoney,
  formatMoney,
  getScopeOptions,
} from "../lib/dashboardHelpers";
import styles from "./MonthlyComparison.module.css";

function BreakdownTooltip({
  active,
  payload,
  categories,
}) {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  const row =
    payload[0]?.payload;

  if (!row) {
    return null;
  }

  const breakdown =
    categories
      .map((category) => ({
        ...category,

        amount:
          Number(
            row[
              category.dataKey
            ]
          ) || 0,
      }))
      .filter(
        (category) =>
          category.amount > 0
      )
      .sort(
        (first, second) =>
          second.amount -
          first.amount
      );

  return (
    <div
      className={
        styles.tooltip
      }
    >
      <div
        className={
          styles.tooltipHeader
        }
      >
        <strong>
          {row.fullLabel}
        </strong>

        <b>
          {formatMoney(
            row.total
          )}
        </b>
      </div>

      {breakdown.length ===
      0 ? (
        <p
          className={
            styles.tooltipEmpty
          }
        >
          支出なし
        </p>
      ) : (
        <div
          className={
            styles.tooltipList
          }
        >
          {breakdown.map(
            (category) => (
              <div
                key={
                  category.id
                }
              >
                <span
                  className={
                    styles.tooltipColor
                  }
                  style={{
                    backgroundColor:
                      category.color,
                  }}
                />

                <span>
                  {category.icon}{" "}
                  {category.name}
                </span>

                <strong>
                  {formatMoney(
                    category.amount
                  )}
                </strong>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function MonthlyComparison({
  members,
  selectedMonth,
  monthlyBreakdownByScope,
  onMonthChange,
}) {
  const scopeOptions =
    getScopeOptions(members);

  const [
    selectedScope,
    setSelectedScope,
  ] = useState("shared");

  const scopeData =
    monthlyBreakdownByScope[
      selectedScope
    ] ?? {
      rows: [],
      categories: [],
    };

  const {
    rows,
    categories,
  } = scopeData;

  const hasData =
    rows.some(
      (row) =>
        Number(row.total) > 0
    );

  const activeScope =
    scopeOptions.find(
      (option) =>
        option.key ===
        selectedScope
    );

  const twelveMonthTotal =
    rows.reduce(
      (sum, row) =>
        sum +
        Number(row.total),
      0
    );

  const categoryTotals =
    useMemo(() => {
      return categories
        .map((category) => ({
          ...category,

          total:
            rows.reduce(
              (sum, row) =>
                sum +
                (
                  Number(
                    row[
                      category.dataKey
                    ]
                  ) || 0
                ),
              0
            ),
        }))
        .filter(
          (category) =>
            category.total > 0
        )
        .sort(
          (first, second) =>
            second.total -
            first.total
        );
    }, [
      categories,
      rows,
    ]);

  function handleBarClick(
    entry
  ) {
    const monthKey =
      entry?.monthKey ??
      entry?.payload
        ?.monthKey;

    if (monthKey) {
      onMonthChange(
        monthKey
      );
    }
  }

  return (
    <section
      className={styles.panel}
    >
      <div
        className={
          styles.header
        }
      >
        <div>
          <p>
            MONTHLY BREAKDOWN
          </p>

          <h2>
            月別の支出内訳
          </h2>

          <span>
            {activeScope?.label}
            のカテゴリ別支出を12期間で比較します。
          </span>
        </div>

        <div
          className={
            styles.totalBox
          }
        >
          <span>
            12期間の支出合計
          </span>

          <strong>
            {formatMoney(
              twelveMonthTotal
            )}
          </strong>
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

      {!hasData ? (
        <div
          className={
            styles.emptyState
          }
        >
          <span>
            📊
          </span>

          <strong>
            支出データがありません
          </strong>

          <p>
            この区分で支出を登録すると、カテゴリ別の積み上げグラフが表示されます。
          </p>
        </div>
      ) : (
        <>
          <div
            className={
              styles.chartScroll
            }
          >
            <div
              className={
                styles.chart
              }
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={rows}
                  margin={{
                    top: 18,
                    right: 12,
                    bottom: 8,
                    left: 0,
                  }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="4 4"
                    stroke="rgba(148, 163, 184, 0.22)"
                  />

                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />

                  <YAxis
                    width={72}
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    tickFormatter={
                      formatCompactMoney
                    }
                  />

                  <Tooltip
                    cursor={{
                      fill:
                        "rgba(99, 102, 241, 0.06)",
                    }}
                    content={
                      <BreakdownTooltip
                        categories={
                          categories
                        }
                      />
                    }
                  />

                  {categories.map(
                    (category) => (
                      <Bar
                        key={
                          category.id
                        }
                        dataKey={
                          category.dataKey
                        }
                        name={
                          category.name
                        }
                        stackId="expense"
                        maxBarSize={52}
                        cursor="pointer"
                        onClick={
                          handleBarClick
                        }
                      >
                        {rows.map(
                          (row) => (
                            <Cell
                              key={`${category.id}-${row.monthKey}`}
                              fill={
                                category.color
                              }
                              fillOpacity={
                                row.monthKey ===
                                selectedMonth
                                  ? 1
                                  : 0.7
                              }
                            />
                          )
                        )}
                      </Bar>
                    )
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className={
              styles.legend
            }
          >
            {categoryTotals.map(
              (category) => (
                <div
                  key={
                    category.id
                  }
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
                        category.color,
                    }}
                  />

                  <strong>
                    {category.icon}{" "}
                    {category.name}
                  </strong>

                  <b>
                    {formatMoney(
                      category.total
                    )}
                  </b>
                </div>
              )
            )}
          </div>

          <p
            className={
              styles.help
            }
          >
            各月の棒はカテゴリ別の積み上げです。棒を押すと、その家計期間へ移動します。
          </p>
        </>
      )}
    </section>
  );
}