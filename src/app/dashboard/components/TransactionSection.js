"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "../actions";
import {
  formatDate,
  formatMoney,
  getScopeOptions,
  getTransactionScopeKey,
} from "../lib/dashboardHelpers";
import styles from "./TransactionSection.module.css";

function SubmitButton({
  children,
  disabled = false,
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={styles.primaryButton}
      disabled={pending || disabled}
    >
      {pending
        ? "保存しています..."
        : children}
    </button>
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
      <span
        className={styles.fieldLabel}
      >
        誰のための登録？
      </span>

      <div
        className={
          styles.allocationOptions
        }
      >
        {scopeOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            className={[
              styles.allocationButton,
              selectedScope === option.key
                ? styles.allocationButtonActive
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() =>
              onChange(option.key)
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      <small>
        「2人のもの」だけが支払い精算の対象です。個人分も支出合計と残予算には含まれます。
      </small>
    </div>
  );
}

function TransactionEditor({
  transaction,
  categories,
  members,
  currentUserId,
  selectedMonth,
  selectedPeriod,
  defaultTransactionDate,
  onCancel,
}) {
  const initialType =
    transaction?.transaction_type ??
    "expense";

  const [
    transactionType,
    setTransactionType,
  ] = useState(initialType);

  const initialScope =
    transaction?.allocation_scope ===
    "personal"
      ? transaction.personal_owner_user_id
      : "shared";

  const [
    selectedScope,
    setSelectedScope,
  ] = useState(
    initialScope ?? "shared",
  );

  const availableCategories =
    useMemo(() => {
      return categories.filter(
        (category) => {
          const matchesType =
            category.category_type ===
            transactionType;

          const canDisplay =
            category.is_active ||
            category.id ===
              transaction?.category_id;

          return (
            matchesType &&
            canDisplay
          );
        },
      );
    }, [
      categories,
      transaction,
      transactionType,
    ]);

  const [
    categoryId,
    setCategoryId,
  ] = useState(
    transaction?.category_id ??
      availableCategories[0]?.id ??
      "",
  );

  const isEditing =
    Boolean(transaction);

  const action = isEditing
    ? updateTransactionAction
    : createTransactionAction;

  function changeType(nextType) {
    setTransactionType(nextType);

    const nextCategory =
      categories.find(
        (category) =>
          category.category_type ===
            nextType &&
          category.is_active,
      );

    setCategoryId(
      nextCategory?.id ?? "",
    );
  }

  return (
    <section
      id="transaction-form"
      className={styles.editorPanel}
    >
      <div
        className={styles.panelHeader}
      >
        <div>
          <p className={styles.eyebrow}>
            {isEditing
              ? "EDIT"
              : "NEW"}
          </p>

          <h2
            id="transaction-modal-title"
          >
            {isEditing
              ? "登録内容を編集"
              : "家計簿を入力"}
          </h2>

          <span>
            {selectedPeriod.rangeLabel}
          </span>
        </div>

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
      </div>

      <form
        action={action}
        className={styles.editorForm}
      >
        <input
          type="hidden"
          name="returnMonth"
          value={selectedMonth}
        />

        <input
          type="hidden"
          name="returnTab"
          value="dashboard"
        />

        <input
          type="hidden"
          name="transactionType"
          value={transactionType}
        />

        <input
          type="hidden"
          name="allocationScope"
          value={
            selectedScope === "shared"
              ? "shared"
              : "personal"
          }
        />

        <input
          type="hidden"
          name="personalOwnerUserId"
          value={
            selectedScope === "shared"
              ? ""
              : selectedScope
          }
        />

        {isEditing && (
          <input
            type="hidden"
            name="transactionId"
            value={transaction.id}
          />
        )}

        <AllocationSelector
          members={members}
          selectedScope={selectedScope}
          onChange={setSelectedScope}
        />

        <div
          className={styles.typeSwitch}
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
              changeType("expense")
            }
          >
            支出
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
              changeType("income")
            }
          >
            収入
          </button>
        </div>

        <div
          className={styles.formGrid}
        >
          <label
            className={styles.fullWidth}
          >
            <span
              className={
                styles.fieldLabel
              }
            >
              内容
            </span>

            <input
              type="text"
              name="title"
              defaultValue={
                transaction?.title ?? ""
              }
              placeholder={
                transactionType ===
                "expense"
                  ? "例：スーパーで食材"
                  : "例：給与"
              }
              maxLength={100}
              required
            />
          </label>

          <label>
            <span
              className={
                styles.fieldLabel
              }
            >
              金額
            </span>

            <div
              className={
                styles.amountInput
              }
            >
              <span>¥</span>

              <input
                type="number"
                name="amount"
                defaultValue={
                  transaction?.amount ??
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
            <span
              className={
                styles.fieldLabel
              }
            >
              日付
            </span>

            <input
              type="date"
              name="transactionDate"
              defaultValue={
                transaction
                  ?.transaction_date ??
                defaultTransactionDate
              }
              min={selectedPeriod.start}
              max={
                selectedPeriod.endInclusive
              }
              required
            />
          </label>

          <label>
            <span
              className={
                styles.fieldLabel
              }
            >
              カテゴリ
            </span>

            <select
              name="categoryId"
              value={categoryId}
              onChange={(event) =>
                setCategoryId(
                  event.target.value,
                )
              }
              required
            >
              {availableCategories.length ===
              0 ? (
                <option value="">
                  カテゴリがありません
                </option>
              ) : (
                availableCategories.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.icon}{" "}
                      {category.name}
                    </option>
                  ),
                )
              )}
            </select>
          </label>

          <label>
            <span
              className={
                styles.fieldLabel
              }
            >
              {transactionType ===
              "expense"
                ? "支払った人"
                : "受け取った人"}
            </span>

            <select
              name="paidByUserId"
              defaultValue={
                transaction
                  ?.paid_by_user_id ??
                currentUserId
              }
              required
            >
              {members.map((member) => (
                <option
                  key={member.user_id}
                  value={member.user_id}
                >
                  {
                    member.profile
                      ?.display_name
                  }
                </option>
              ))}
            </select>
          </label>

          <label
            className={styles.fullWidth}
          >
            <span
              className={
                styles.fieldLabel
              }
            >
              メモ
            </span>

            <textarea
              name="memo"
              defaultValue={
                transaction?.memo ?? ""
              }
              maxLength={500}
              rows={3}
            />
          </label>
        </div>

        {availableCategories.length ===
          0 && (
          <div
            className={
              styles.categoryWarning
            }
          >
            この種類のカテゴリがありません。管理タブから追加してください。
          </div>
        )}

        <div
          className={styles.formActions}
        >
          <SubmitButton
            disabled={
              availableCategories.length ===
              0
            }
          >
            {isEditing
              ? "変更を保存"
              : "登録する"}
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}

function TransactionHistory({
  transactions,
  members,
  selectedMonth,
  selectedPeriod,
  onEdit,
}) {
  const scopeOptions =
    getScopeOptions(members);

  const [
    scopeFilter,
    setScopeFilter,
  ] = useState("shared");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("all");

  const filteredTransactions =
    useMemo(() => {
      return transactions.filter(
        (transaction) => {
          const matchesScope =
            getTransactionScopeKey(
              transaction,
            ) === scopeFilter;

          const matchesType =
            typeFilter === "all" ||
            transaction
              .transaction_type ===
              typeFilter;

          return (
            matchesScope &&
            matchesType
          );
        },
      );
    }, [
      transactions,
      scopeFilter,
      typeFilter,
    ]);

  return (
    <details
      className={
        styles.historyAccordion
      }
    >
      <summary
        className={styles.historySummary}
      >
        <div>
          <span
            className={styles.eyebrow}
          >
            HISTORY
          </span>

          <strong>登録履歴</strong>

          <small>
            {selectedPeriod.label}
            ・クリックして開く
          </small>
        </div>

        <b>
          {transactions.length}件
        </b>
      </summary>

      <div
        className={styles.historyContent}
      >
        <div
          className={
            styles.historyScopeTabs
          }
        >
          {scopeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={[
                styles.historyScopeButton,
                scopeFilter === option.key
                  ? styles.historyScopeActive
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                setScopeFilter(option.key)
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        <div
          className={styles.typeFilters}
        >
          {[
            {
              key: "all",
              label: "すべて",
            },
            {
              key: "expense",
              label: "支出",
            },
            {
              key: "income",
              label: "収入",
            },
          ].map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={[
                styles.typeFilter,
                typeFilter === filter.key
                  ? styles.typeFilterActive
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                setTypeFilter(filter.key)
              }
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filteredTransactions.length ===
        0 ? (
          <div
            className={
              styles.emptyHistory
            }
          >
            <span>🧾</span>

            <strong>
              登録はありません
            </strong>
          </div>
        ) : (
          <div
            className={
              styles.historyList
            }
          >
            {filteredTransactions.map(
              (transaction) => {
                const isExpense =
                  transaction
                    .transaction_type ===
                  "expense";

                return (
                  <article
                    key={transaction.id}
                    className={
                      styles.historyItem
                    }
                  >
                    <div
                      className={
                        styles.transactionMain
                      }
                    >
                      <span
                        className={
                          styles.transactionIcon
                        }
                        style={{
                          backgroundColor:
                            `${
                              transaction
                                .category
                                ?.color ??
                              "#64748B"
                            }18`,
                        }}
                      >
                        {transaction
                          .category?.icon ??
                          "🏷️"}
                      </span>

                      <div
                        className={
                          styles.transactionInfo
                        }
                      >
                        <div
                          className={
                            styles.transactionTitle
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

                        <div
                          className={
                            styles.transactionMeta
                          }
                        >
                          <span>
                            {formatDate(
                              transaction
                                .transaction_date,
                            )}
                          </span>

                          <span>
                            {
                              transaction
                                .category?.name
                            }
                          </span>

                          <span>
                            {isExpense
                              ? "支払："
                              : "受取："}
                            {
                              transaction
                                .paid_by
                                ?.display_name
                            }
                          </span>

                          <span>
                            入力：
                            {
                              transaction
                                .entered_by
                                ?.display_name
                            }
                          </span>
                        </div>

                        {transaction.memo && (
                          <p>
                            {transaction.memo}
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      className={
                        styles.transactionRight
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
                          transaction.amount,
                        )}
                      </strong>

                      <div
                        className={
                          styles.transactionActions
                        }
                      >
                        <button
                          type="button"
                          className={
                            styles.editButton
                          }
                          onClick={() =>
                            onEdit(transaction)
                          }
                        >
                          編集
                        </button>

                        <form
                          action={
                            deleteTransactionAction
                          }
                          onSubmit={(
                            event,
                          ) => {
                            if (
                              !window.confirm(
                                `「${transaction.title}」を削除しますか？`,
                              )
                            ) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input
                            type="hidden"
                            name="transactionId"
                            value={
                              transaction.id
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
                            value="dashboard"
                          />

                          <button
                            type="submit"
                            className={
                              styles.deleteButton
                            }
                          >
                            削除
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </div>
    </details>
  );
}

export default function TransactionSection({
  editingTransaction,
  categories,
  members,
  currentUserId,
  transactions,
  selectedMonth,
  selectedPeriod,
  defaultTransactionDate,
  isEditorOpen,
  onEdit,
  onCloseEditor,
}) {
  useEffect(() => {
    if (!isEditorOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onCloseEditor();
      }
    }

    document.body.style.overflow =
      "hidden";

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    isEditorOpen,
    onCloseEditor,
  ]);

  return (
    <>
      <TransactionHistory
        transactions={transactions}
        members={members}
        selectedMonth={selectedMonth}
        selectedPeriod={selectedPeriod}
        onEdit={onEdit}
      />

      {isEditorOpen && (
        <div
          className={
            styles.modalBackdrop
          }
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              onCloseEditor();
            }
          }}
        >
          <div
            className={
              styles.modalDialog
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-modal-title"
          >
            <button
              type="button"
              className={
                styles.modalCloseButton
              }
              onClick={onCloseEditor}
              aria-label="入力画面を閉じる"
            >
              ×
            </button>

            <TransactionEditor
              key={
                editingTransaction?.id ??
                `new-${selectedMonth}`
              }
              transaction={
                editingTransaction
              }
              categories={categories}
              members={members}
              currentUserId={
                currentUserId
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
              onCancel={onCloseEditor}
            />
          </div>
        </div>
      )}
    </>
  );
}