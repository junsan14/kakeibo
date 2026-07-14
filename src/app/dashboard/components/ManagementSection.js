"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useFormStatus,
} from "react-dom";
import {
  createCategoryAction,
  createRecurringTransactionAction,
  saveMonthlyPlanAction,
  toggleCategoryAction,
  toggleRecurringTransactionAction,
  updateHouseholdSettingsAction,
  updateRecurringTransactionAction,
} from "../actions";
import {
  formatMoney,
  getScopeOptions,
} from "../lib/dashboardHelpers";
import styles from "./ManagementSection.module.css";

function SubmitButton({
  children,
  variant = "primary",
  disabled = false,
}) {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      className={
        variant === "small"
          ? styles.smallButton
          : styles.primaryButton
      }
      disabled={
        pending ||
        disabled
      }
    >
      {pending
        ? "処理中..."
        : children}
    </button>
  );
}

function HouseholdInfo({
  household,
  members,
}) {
  return (
    <section
      className={
        styles.panel
      }
    >
      <div
        className={
          styles.panelHeader
        }
      >
        <p>
          HOUSEHOLD
        </p>

        <h2>
          家計情報
        </h2>

        <span>
          家計名、参加メンバー、招待コードを確認できます。
        </span>
      </div>

      <div
        className={
          styles.householdGrid
        }
      >
        <div
          className={
            styles.householdName
          }
        >
          <span>
            家計名
          </span>

          <strong>
            {household.name}
          </strong>
        </div>

        <div
          className={
            styles.inviteCode
          }
        >
          <span>
            パートナー招待コード
          </span>

          <strong>
            {household.invite_code}
          </strong>

          <small>
            最大2人まで参加できます
          </small>
        </div>
      </div>

      <div
        className={
          styles.memberList
        }
      >
        {members.map(
          (member) => {
            const displayName =
              member.profile
                ?.display_name ??
              "ユーザー";

            return (
              <article
                key={
                  member.user_id
                }
              >
                <span
                  className={
                    styles.memberAvatar
                  }
                >
                  {displayName.slice(
                    0,
                    1
                  )}
                </span>

                <div>
                  <strong>
                    {displayName}
                  </strong>

                  <small>
                    {member.role ===
                    "owner"
                      ? "管理者"
                      : "メンバー"}
                  </small>
                </div>
              </article>
            );
          }
        )}
      </div>
    </section>
  );
}

function HouseholdSettings({
  settings,
  selectedMonth,
  selectedPeriod,
  monthlyGoal,
}) {
  return (
    <section
      className={
        styles.settingsGrid
      }
    >
      <article
        className={
          styles.panel
        }
      >
        <div
          className={
            styles.panelHeader
          }
        >
          <p>
            PERIOD SETTINGS
          </p>

          <h2>
            家計期間の設定
          </h2>

          <span>
            給与振込日に合わせて開始日を設定します。
          </span>
        </div>

        <form
          action={
            updateHouseholdSettingsAction
          }
          className={
            styles.settingsForm
          }
        >
          <input
            type="hidden"
            name="returnMonth"
            value={
              selectedMonth
            }
          />

          <input
            type="hidden"
            name="returnTab"
            value="management"
          />

          <label>
            <span>
              家計期間の開始日
            </span>

            <select
              name="cycleStartDay"
              defaultValue={
                settings
                  .cycle_start_day
              }
            >
              {Array.from(
                {
                  length: 28,
                },
                (_, index) =>
                  index + 1
              ).map((day) => (
                <option
                  key={day}
                  value={day}
                >
                  毎月{day}日
                </option>
              ))}
            </select>

            <small>
              例：25日の場合、7月25日〜8月24日を7月期として集計します。
            </small>
          </label>

          <label>
            <span>
              標準の貯金目標
            </span>

            <div
              className={
                styles.amountInput
              }
            >
              <i>
                ¥
              </i>

              <input
                type="number"
                name="defaultSavingsGoal"
                defaultValue={
                  settings
                    .default_savings_goal
                }
                min="0"
                step="1"
                inputMode="numeric"
              />
            </div>

            <small>
              月ごとの目標が未設定の場合に使用します。
            </small>
          </label>

          <SubmitButton>
            管理設定を保存
          </SubmitButton>
        </form>
      </article>

      <article
        className={
          styles.panel
        }
      >
        <div
          className={
            styles.panelHeader
          }
        >
          <p>
            SAVINGS GOAL
          </p>

          <h2>
            {selectedPeriod.label}
            の貯金目標
          </h2>

          <span>
            選択中の期間だけに適用されます。
          </span>
        </div>

        <div
          className={
            styles.goalDisplay
          }
        >
          <span>
            現在の目標
          </span>

          <strong>
            {formatMoney(
              monthlyGoal
            )}
          </strong>

          <small>
            {selectedPeriod.rangeLabel}
          </small>
        </div>

        <form
          action={
            saveMonthlyPlanAction
          }
          className={
            styles.settingsForm
          }
        >
          <input
            type="hidden"
            name="returnMonth"
            value={
              selectedMonth
            }
          />

          <input
            type="hidden"
            name="returnTab"
            value="management"
          />

          <label>
            <span>
              貯金目標
            </span>

            <div
              className={
                styles.amountInput
              }
            >
              <i>
                ¥
              </i>

              <input
                type="number"
                name="savingsGoal"
                defaultValue={
                  monthlyGoal
                }
                min="0"
                step="1"
                inputMode="numeric"
              />
            </div>
          </label>

          <SubmitButton>
            今期の目標を保存
          </SubmitButton>
        </form>
      </article>
    </section>
  );
}

function AllocationSelector({
  members,
  selectedScope,
  onChange,
}) {
  const scopeOptions =
    getScopeOptions(members);

  return (
    <div
      className={
        styles.allocationSection
      }
    >
      <span>
        誰のための固定収支？
      </span>

      <div
        className={
          styles.allocationOptions
        }
      >
        {scopeOptions.map(
          (option) => (
            <button
              key={option.key}
              type="button"
              className={[
                styles.allocationButton,
                selectedScope ===
                option.key
                  ? styles.allocationButtonActive
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                onChange(
                  option.key
                )
              }
            >
              {option.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function RecurringForm({
  recurring,
  categories,
  members,
  currentUserId,
  selectedMonth,
  onCancel,
}) {
  const [
    transactionType,
    setTransactionType,
  ] = useState(
    recurring
      ?.transaction_type ??
    "expense"
  );

  const initialScope =
    recurring
      ?.allocation_scope ===
      "personal"
      ? recurring
          .personal_owner_user_id
      : "shared";

  const [
    selectedScope,
    setSelectedScope,
  ] = useState(
    initialScope ??
      "shared"
  );

  const availableCategories =
    useMemo(() => {
      return categories.filter(
        (category) =>
          category.category_type ===
            transactionType &&
          (
            category.is_active ||
            category.id ===
              recurring
                ?.category_id
          )
      );
    }, [
      categories,
      recurring,
      transactionType,
    ]);

  const [
    categoryId,
    setCategoryId,
  ] = useState(
    recurring?.category_id ??
      availableCategories[0]
        ?.id ??
      ""
  );

  const isEditing =
    Boolean(recurring);

  const action =
    isEditing
      ? updateRecurringTransactionAction
      : createRecurringTransactionAction;

  function changeType(
    nextType
  ) {
    setTransactionType(
      nextType
    );

    const nextCategory =
      categories.find(
        (category) =>
          category.category_type ===
            nextType &&
          category.is_active
      );

    setCategoryId(
      nextCategory?.id ??
        ""
    );
  }

  return (
    <form
      id="recurring-form"
      action={action}
      className={
        styles.recurringForm
      }
    >
      <input
        type="hidden"
        name="returnMonth"
        value={
          selectedMonth
        }
      />

      <input
        type="hidden"
        name="returnTab"
        value="management"
      />

      <input
        type="hidden"
        name="transactionType"
        value={
          transactionType
        }
      />

      <input
        type="hidden"
        name="allocationScope"
        value={
          selectedScope ===
          "shared"
            ? "shared"
            : "personal"
        }
      />

      <input
        type="hidden"
        name="personalOwnerUserId"
        value={
          selectedScope ===
          "shared"
            ? ""
            : selectedScope
        }
      />

      {isEditing && (
        <input
          type="hidden"
          name="recurringGroupId"
          value={
            recurring
              .recurring_group_id
          }
        />
      )}

      <AllocationSelector
        members={members}
        selectedScope={
          selectedScope
        }
        onChange={
          setSelectedScope
        }
      />

      <div
        className={
          styles.typeSwitch
        }
      >
        <button
          type="button"
          className={[
            styles.typeButton,
            transactionType ===
            "expense"
              ? styles.expenseActive
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() =>
            changeType(
              "expense"
            )
          }
        >
          固定支出
        </button>

        <button
          type="button"
          className={[
            styles.typeButton,
            transactionType ===
            "income"
              ? styles.incomeActive
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() =>
            changeType(
              "income"
            )
          }
        >
          固定収入
        </button>
      </div>

      <div
        className={
          styles.recurringFormGrid
        }
      >
        <label
          className={
            styles.fullWidth
          }
        >
          <span>
            名称
          </span>

          <input
            type="text"
            name="title"
            defaultValue={
              recurring?.title ??
              ""
            }
            placeholder={
              transactionType ===
                "expense"
                ? "例：インターネット代"
                : "例：給与"
            }
            maxLength={100}
            required
          />
        </label>

        <label>
          <span>
            金額
          </span>

          <div
            className={
              styles.amountInput
            }
          >
            <i>
              ¥
            </i>

            <input
              type="number"
              name="amount"
              defaultValue={
                recurring?.amount ??
                ""
              }
              min="1"
              step="1"
              inputMode="numeric"
              required
            />
          </div>
        </label>

        <label>
          <span>
            毎月の登録日
          </span>

          <select
            name="dueDay"
            defaultValue={
              recurring?.due_day ??
              1
            }
          >
            {Array.from(
              {
                length: 28,
              },
              (_, index) =>
                index + 1
            ).map((day) => (
              <option
                key={day}
                value={day}
              >
                {day}日
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>
            カテゴリ
          </span>

          <select
            name="categoryId"
            value={
              categoryId
            }
            onChange={(
              event
            ) =>
              setCategoryId(
                event.target.value
              )
            }
            required
          >
            {availableCategories
              .length === 0 ? (
              <option value="">
                カテゴリがありません
              </option>
            ) : (
              availableCategories.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {
                      category.icon
                    }{" "}
                    {
                      category.name
                    }
                  </option>
                )
              )
            )}
          </select>
        </label>

        <label>
          <span>
            {transactionType ===
            "expense"
              ? "支払う人"
              : "受け取る人"}
          </span>

          <select
            name="paidByUserId"
            defaultValue={
              recurring
                ?.paid_by_user_id ??
              currentUserId
            }
            required
          >
            {members.map(
              (member) => (
                <option
                  key={
                    member.user_id
                  }
                  value={
                    member.user_id
                  }
                >
                  {
                    member.profile
                      ?.display_name
                  }
                </option>
              )
            )}
          </select>
        </label>

        <label
          className={
            styles.fullWidth
          }
        >
          <span>
            メモ
          </span>

          <textarea
            name="memo"
            defaultValue={
              recurring?.memo ??
              ""
            }
            maxLength={500}
            rows={2}
          />
        </label>
      </div>

      <div
        className={
          styles.recurringActions
        }
      >
        {isEditing && (
          <button
            type="button"
            className={
              styles.cancelButton
            }
            onClick={onCancel}
          >
            編集をやめる
          </button>
        )}

        <SubmitButton
          disabled={
            availableCategories
              .length === 0
          }
        >
          {isEditing
            ? `${selectedMonth}期以降を変更`
            : `${selectedMonth}期から追加`}
        </SubmitButton>
      </div>
    </form>
  );
}

function RecurringManager({
  recurringTransactions,
  categories,
  members,
  currentUserId,
  selectedMonth,
}) {
  const [
    editingRecurring,
    setEditingRecurring,
  ] = useState(null);

  function startEdit(item) {
    setEditingRecurring(item);

    requestAnimationFrame(
      () => {
        document
          .getElementById(
            "recurring-form"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }
    );
  }

  return (
    <section
      className={
        styles.panel
      }
    >
      <div
        className={
          styles.panelHeader
        }
      >
        <p>
          RECURRING
        </p>

        <h2>
          固定収支
        </h2>

        <span>
          変更は
          {selectedMonth}
          期以降に適用され、過去の期間には影響しません。
        </span>
      </div>

      <RecurringForm
        key={
          editingRecurring
            ?.recurring_group_id ??
          "new-recurring"
        }
        recurring={
          editingRecurring
        }
        categories={
          categories
        }
        members={members}
        currentUserId={
          currentUserId
        }
        selectedMonth={
          selectedMonth
        }
        onCancel={() =>
          setEditingRecurring(
            null
          )
        }
      />

      <div
        className={
          styles.recurringList
        }
      >
        {recurringTransactions
          .length === 0 ? (
          <div
            className={
              styles.emptyState
            }
          >
            <span>
              🔁
            </span>

            <strong>
              固定収支はありません
            </strong>
          </div>
        ) : (
          recurringTransactions.map(
            (item) => {
              const isExpense =
                item
                  .transaction_type ===
                "expense";

              const scopeLabel =
                item
                  .allocation_scope ===
                  "personal"
                  ? `${item.personal_owner?.display_name ?? "個人"}個人`
                  : "2人のもの";

              return (
                <article
                  key={
                    item
                      .recurring_group_id
                  }
                  className={[
                    styles.recurringItem,
                    !item.is_active
                      ? styles.recurringInactive
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div
                    className={
                      styles.recurringIdentity
                    }
                  >
                    <span
                      className={
                        styles.recurringIcon
                      }
                      style={{
                        backgroundColor:
                          `${item.category?.color ?? "#64748B"}18`,
                      }}
                    >
                      {item.category
                        ?.icon ??
                        "🏷️"}
                    </span>

                    <div>
                      <div
                        className={
                          styles.recurringTitle
                        }
                      >
                        <strong>
                          {item.title}
                        </strong>

                        <span>
                          {scopeLabel}
                        </span>

                        {!item.is_active && (
                          <span
                            className={
                              styles.stoppedBadge
                            }
                          >
                            停止中
                          </span>
                        )}
                      </div>

                      <div
                        className={
                          styles.recurringMeta
                        }
                      >
                        <span>
                          毎月
                          {item.due_day}
                          日
                        </span>

                        <span>
                          {
                            item.category
                              ?.name
                          }
                        </span>

                        <span>
                          {item.effective_from.slice(
                            0,
                            7
                          )}
                          期から
                        </span>

                        <span>
                          {isExpense
                            ? "支払："
                            : "受取："}
                          {
                            item.paid_by
                              ?.display_name
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={
                      styles.recurringRight
                    }
                  >
                    <strong
                      className={
                        isExpense
                          ? styles.expenseAmount
                          : styles.incomeAmount
                      }
                    >
                      {isExpense
                        ? "-"
                        : "+"}
                      {formatMoney(
                        item.amount
                      )}
                    </strong>

                    <div
                      className={
                        styles.recurringItemActions
                      }
                    >
                      <button
                        type="button"
                        className={
                          styles.editButton
                        }
                        onClick={() =>
                          startEdit(item)
                        }
                      >
                        編集
                      </button>

                      <form
                        action={
                          toggleRecurringTransactionAction
                        }
                      >
                        <input
                          type="hidden"
                          name="recurringGroupId"
                          value={
                            item
                              .recurring_group_id
                          }
                        />

                        <input
                          type="hidden"
                          name="returnMonth"
                          value={
                            selectedMonth
                          }
                        />

                        <input
                          type="hidden"
                          name="returnTab"
                          value="management"
                        />

                        <SubmitButton
                          variant="small"
                        >
                          {item.is_active
                            ? "この月以降停止"
                            : "この月以降再開"}
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                </article>
              );
            }
          )
        )}
      </div>
    </section>
  );
}

function CategoryManager({
  categories,
  selectedMonth,
}) {
  const expenseCategories =
    categories.filter(
      (category) =>
        category.category_type ===
        "expense"
    );

  const incomeCategories =
    categories.filter(
      (category) =>
        category.category_type ===
        "income"
    );

  function renderCategoryList(
    items
  ) {
    return items.map(
      (category) => (
        <article
          key={category.id}
          className={[
            styles.categoryItem,
            !category.is_active
              ? styles.categoryInactive
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div
            className={
              styles.categoryIdentity
            }
          >
            <span
              style={{
                backgroundColor:
                  `${category.color}18`,
              }}
            >
              {category.icon}
            </span>

            <div>
              <strong>
                {category.name}
              </strong>

              <small>
                {category.is_active
                  ? "使用中"
                  : "非表示"}
              </small>
            </div>
          </div>

          <form
            action={
              toggleCategoryAction
            }
          >
            <input
              type="hidden"
              name="categoryId"
              value={
                category.id
              }
            />

            <input
              type="hidden"
              name="returnMonth"
              value={
                selectedMonth
              }
            />

            <input
              type="hidden"
              name="returnTab"
              value="management"
            />

            <SubmitButton
              variant="small"
            >
              {category.is_active
                ? "非表示"
                : "表示"}
            </SubmitButton>
          </form>
        </article>
      )
    );
  }

  return (
    <section
      className={
        styles.panel
      }
    >
      <div
        className={
          styles.panelHeader
        }
      >
        <p>
          CATEGORY
        </p>

        <h2>
          カテゴリ管理
        </h2>

        <span>
          支出・収入カテゴリを追加または非表示にできます。
        </span>
      </div>

      <form
        action={
          createCategoryAction
        }
        className={
          styles.categoryForm
        }
      >
        <input
          type="hidden"
          name="returnMonth"
          value={
            selectedMonth
          }
        />

        <input
          type="hidden"
          name="returnTab"
          value="management"
        />

        <label>
          <span>
            種類
          </span>

          <select
            name="categoryType"
            defaultValue="expense"
          >
            <option value="expense">
              支出
            </option>

            <option value="income">
              収入
            </option>
          </select>
        </label>

        <label>
          <span>
            アイコン
          </span>

          <input
            type="text"
            name="categoryIcon"
            defaultValue="🏷️"
            maxLength={8}
          />
        </label>

        <label>
          <span>
            カテゴリ名
          </span>

          <input
            type="text"
            name="categoryName"
            placeholder="例：ペット"
            maxLength={30}
            required
          />
        </label>

        <label>
          <span>
            色
          </span>

          <input
            type="color"
            name="categoryColor"
            defaultValue="#6366F1"
            className={
              styles.colorInput
            }
          />
        </label>

        <div
          className={
            styles.categorySubmit
          }
        >
          <SubmitButton>
            追加
          </SubmitButton>
        </div>
      </form>

      <div
        className={
          styles.categoryColumns
        }
      >
        <div
          className={
            styles.categoryColumn
          }
        >
          <div
            className={
              styles.categoryColumnHeader
            }
          >
            <strong>
              支出カテゴリ
            </strong>

            <span>
              {expenseCategories.length}
              件
            </span>
          </div>

          <div
            className={
              styles.categoryList
            }
          >
            {renderCategoryList(
              expenseCategories
            )}
          </div>
        </div>

        <div
          className={
            styles.categoryColumn
          }
        >
          <div
            className={
              styles.categoryColumnHeader
            }
          >
            <strong>
              収入カテゴリ
            </strong>

            <span>
              {incomeCategories.length}
              件
            </span>
          </div>

          <div
            className={
              styles.categoryList
            }
          >
            {renderCategoryList(
              incomeCategories
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ManagementSection({
  household,
  profile,
  members,
  categories,
  recurringTransactions,
  settings,
  selectedMonth,
  selectedPeriod,
  monthlyGoal,
}) {
  return (
    <div
      className={
        styles.management
      }
    >
      <HouseholdInfo
        household={household}
        members={members}
      />

      <HouseholdSettings
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

      <RecurringManager
        recurringTransactions={
          recurringTransactions
        }
        categories={
          categories
        }
        members={members}
        currentUserId={
          profile.id
        }
        selectedMonth={
          selectedMonth
        }
      />

      <CategoryManager
        categories={
          categories
        }
        selectedMonth={
          selectedMonth
        }
      />
    </div>
  );
}