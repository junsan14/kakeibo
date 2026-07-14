"use server";

import {
  revalidatePath,
} from "next/cache";
import {
  redirect,
} from "next/navigation";
import {
  createClient,
} from "@/lib/supabase/server";

const VALID_TABS = [
  "dashboard",
  "comparison",
  "management",
];

const RECURRING_SELECT = `
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
  created_by,
  created_at,
  updated_at
`;

function getFormValue(
  formData,
  key
) {
  const value =
    formData.get(key);

  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value.trim();
}

function normalizeMonthKey(
  value
) {
  if (
    typeof value === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(
      value
    )
  ) {
    return value;
  }

  return "";
}

function normalizeTab(value) {
  if (
    VALID_TABS.includes(
      value
    )
  ) {
    return value;
  }

  return "dashboard";
}

function getReturnState(
  formData
) {
  return {
    monthKey:
      normalizeMonthKey(
        getFormValue(
          formData,
          "returnMonth"
        )
      ),

    tab:
      normalizeTab(
        getFormValue(
          formData,
          "returnTab"
        )
      ),
  };
}

function createDashboardUrl({
  type,
  message,
  monthKey = "",
  tab = "dashboard",
}) {
  const params =
    new URLSearchParams();

  const normalizedMonth =
    normalizeMonthKey(
      monthKey
    );

  if (normalizedMonth) {
    params.set(
      "month",
      normalizedMonth
    );
  }

  params.set(
    "tab",
    normalizeTab(tab)
  );

  if (
    type &&
    message
  ) {
    params.set(
      type,
      message
    );
  }

  return `/dashboard?${params.toString()}`;
}

function redirectWithError(
  message,
  monthKey = "",
  tab = "dashboard"
) {
  redirect(
    createDashboardUrl({
      type: "error",
      message,
      monthKey,
      tab,
    })
  );
}

function redirectWithMessage(
  message,
  monthKey = "",
  tab = "dashboard"
) {
  redirect(
    createDashboardUrl({
      type: "message",
      message,
      monthKey,
      tab,
    })
  );
}

function getDatabaseErrorMessage(
  error,
  fallbackMessage
) {
  if (!error) {
    return fallbackMessage;
  }

  switch (error.code) {
    case "23505":
      return "同じ内容のデータがすでに登録されています。";

    case "23503":
      return "関連するデータが見つからないため処理できませんでした。";

    case "23514":
      return "入力内容が登録条件を満たしていません。";

    case "42501":
      return "このデータを操作する権限がありません。";

    default:
      return (
        error.message ||
        fallbackMessage
      );
  }
}

function parsePositiveAmount(
  value
) {
  const normalized =
    value.replace(
      /[,\s¥￥]/g,
      ""
    );

  const amount =
    Number(normalized);

  if (
    !Number.isSafeInteger(
      amount
    ) ||
    amount <= 0
  ) {
    return null;
  }

  return amount;
}

function parseNonNegativeAmount(
  value
) {
  const normalized =
    value.replace(
      /[,\s¥￥]/g,
      ""
    );

  if (
    normalized === ""
  ) {
    return 0;
  }

  const amount =
    Number(normalized);

  if (
    !Number.isSafeInteger(
      amount
    ) ||
    amount < 0
  ) {
    return null;
  }

  return amount;
}

function parseIntegerInRange(
  value,
  minimum,
  maximum
) {
  const number =
    Number(value);

  if (
    !Number.isInteger(number) ||
    number < minimum ||
    number > maximum
  ) {
    return null;
  }

  return number;
}

function isValidDate(value) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const date =
    new Date(
      `${value}T00:00:00.000Z`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return false;
  }

  return (
    date
      .toISOString()
      .slice(0, 10) ===
    value
  );
}

function parseAllocation(
  formData
) {
  const allocationScope =
    getFormValue(
      formData,
      "allocationScope"
    );

  const personalOwnerUserId =
    getFormValue(
      formData,
      "personalOwnerUserId"
    );

  if (
    allocationScope ===
    "shared"
  ) {
    return {
      error: null,
      allocationScope:
        "shared",
      personalOwnerUserId:
        null,
    };
  }

  if (
    allocationScope ===
      "personal" &&
    personalOwnerUserId
  ) {
    return {
      error: null,
      allocationScope:
        "personal",
      personalOwnerUserId,
    };
  }

  return {
    error:
      "共有または個人の区分を選択してください。",
  };
}

function parseTransactionForm(
  formData
) {
  const transactionType =
    getFormValue(
      formData,
      "transactionType"
    );

  const title =
    getFormValue(
      formData,
      "title"
    );

  const amount =
    parsePositiveAmount(
      getFormValue(
        formData,
        "amount"
      )
    );

  const transactionDate =
    getFormValue(
      formData,
      "transactionDate"
    );

  const categoryId =
    getFormValue(
      formData,
      "categoryId"
    );

  const paidByUserId =
    getFormValue(
      formData,
      "paidByUserId"
    );

  const memo =
    getFormValue(
      formData,
      "memo"
    );

  const allocation =
    parseAllocation(
      formData
    );

  if (
    transactionType !==
      "expense" &&
    transactionType !==
      "income"
  ) {
    return {
      error:
        "支出または収入を選択してください。",
    };
  }

  if (!title) {
    return {
      error:
        "内容を入力してください。",
    };
  }

  if (
    title.length > 100
  ) {
    return {
      error:
        "内容は100文字以内で入力してください。",
    };
  }

  if (amount === null) {
    return {
      error:
        "金額は1円以上の整数で入力してください。",
    };
  }

  if (
    !isValidDate(
      transactionDate
    )
  ) {
    return {
      error:
        "日付を正しく入力してください。",
    };
  }

  if (!categoryId) {
    return {
      error:
        "カテゴリを選択してください。",
    };
  }

  if (!paidByUserId) {
    return {
      error:
        "支払った人または受け取った人を選択してください。",
    };
  }

  if (
    memo.length > 500
  ) {
    return {
      error:
        "メモは500文字以内で入力してください。",
    };
  }

  if (allocation.error) {
    return {
      error:
        allocation.error,
    };
  }

  return {
    error: null,

    values: {
      transactionType,
      title,
      amount,
      transactionDate,
      categoryId,
      paidByUserId,
      memo:
        memo || null,

      allocationScope:
        allocation
          .allocationScope,

      personalOwnerUserId:
        allocation
          .personalOwnerUserId,
    },
  };
}

function parseRecurringForm(
  formData
) {
  const transactionType =
    getFormValue(
      formData,
      "transactionType"
    );

  const title =
    getFormValue(
      formData,
      "title"
    );

  const amount =
    parsePositiveAmount(
      getFormValue(
        formData,
        "amount"
      )
    );

  const categoryId =
    getFormValue(
      formData,
      "categoryId"
    );

  const paidByUserId =
    getFormValue(
      formData,
      "paidByUserId"
    );

  const dueDay =
    parseIntegerInRange(
      getFormValue(
        formData,
        "dueDay"
      ),
      1,
      28
    );

  const memo =
    getFormValue(
      formData,
      "memo"
    );

  const allocation =
    parseAllocation(
      formData
    );

  if (
    transactionType !==
      "expense" &&
    transactionType !==
      "income"
  ) {
    return {
      error:
        "固定支出または固定収入を選択してください。",
    };
  }

  if (!title) {
    return {
      error:
        "固定収支の名称を入力してください。",
    };
  }

  if (
    title.length > 100
  ) {
    return {
      error:
        "名称は100文字以内で入力してください。",
    };
  }

  if (amount === null) {
    return {
      error:
        "金額は1円以上の整数で入力してください。",
    };
  }

  if (!categoryId) {
    return {
      error:
        "カテゴリを選択してください。",
    };
  }

  if (!paidByUserId) {
    return {
      error:
        "支払った人または受け取った人を選択してください。",
    };
  }

  if (dueDay === null) {
    return {
      error:
        "登録日は1日から28日の間で入力してください。",
    };
  }

  if (
    memo.length > 500
  ) {
    return {
      error:
        "メモは500文字以内で入力してください。",
    };
  }

  if (allocation.error) {
    return {
      error:
        allocation.error,
    };
  }

  return {
    error: null,

    values: {
      transactionType,
      title,
      amount,
      categoryId,
      paidByUserId,
      dueDay,
      memo:
        memo || null,

      allocationScope:
        allocation
          .allocationScope,

      personalOwnerUserId:
        allocation
          .personalOwnerUserId,
    },
  };
}

async function getAuthenticatedUserId(
  supabase
) {
  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  return (
    claimsData
      ?.claims
      ?.sub ??
    null
  );
}

async function requireUser(
  supabase
) {
  const userId =
    await getAuthenticatedUserId(
      supabase
    );

  if (!userId) {
    redirect(
      `/login?error=${encodeURIComponent(
        "ログインしてください。"
      )}`
    );
  }

  return userId;
}

async function getHouseholdContext(
  supabase
) {
  const userId =
    await getAuthenticatedUserId(
      supabase
    );

  if (!userId) {
    return null;
  }

  const {
    data: membership,
    error,
  } = await supabase
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
    .maybeSingle();

  if (
    error ||
    !membership
      ?.household_id
  ) {
    return null;
  }

  return {
    userId,

    householdId:
      membership
        .household_id,

    role:
      membership.role,
  };
}

async function requireHousehold(
  supabase,
  monthKey = "",
  tab = "dashboard"
) {
  const context =
    await getHouseholdContext(
      supabase
    );

  if (!context) {
    redirectWithError(
      "家計情報を取得できませんでした。",
      monthKey,
      tab
    );
  }

  return context;
}

async function validateCategory(
  supabase,
  householdId,
  categoryId,
  transactionType,
  monthKey = "",
  tab = "dashboard"
) {
  const {
    data,
    error,
  } = await supabase
    .from("categories")
    .select(
      "id"
    )
    .eq(
      "id",
      categoryId
    )
    .eq(
      "household_id",
      householdId
    )
    .eq(
      "category_type",
      transactionType
    )
    .maybeSingle();

  if (
    error ||
    !data
  ) {
    redirectWithError(
      "選択したカテゴリが見つからないか、種類が一致していません。",
      monthKey,
      tab
    );
  }
}

async function validateMember(
  supabase,
  householdId,
  userId,
  errorMessage,
  monthKey = "",
  tab = "dashboard"
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "household_members"
    )
    .select(
      "user_id"
    )
    .eq(
      "household_id",
      householdId
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (
    error ||
    !data
  ) {
    redirectWithError(
      errorMessage,
      monthKey,
      tab
    );
  }
}

async function validateTransactionMembers(
  supabase,
  householdId,
  values,
  monthKey,
  tab
) {
  await validateMember(
    supabase,
    householdId,
    values.paidByUserId,
    "支払った人または受け取った人が家計に参加していません。",
    monthKey,
    tab
  );

  if (
    values.allocationScope ===
      "personal" &&
    values.personalOwnerUserId
  ) {
    await validateMember(
      supabase,
      householdId,
      values.personalOwnerUserId,
      "個人購入の所有者が家計に参加していません。",
      monthKey,
      tab
    );
  }
}

function getRecurringDate({
  periodKey,
  cycleStartDay,
  dueDay,
}) {
  const [
    year,
    month,
  ] =
    periodKey
      .split("-")
      .map(Number);

  const useNextMonth =
    dueDay <
    cycleStartDay;

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1 +
          (
            useNextMonth
              ? 1
              : 0
          ),
        dueDay
      )
    );

  return date
    .toISOString()
    .slice(0, 10);
}

async function getCycleStartDay(
  supabase,
  householdId
) {
  const {
    data,
  } = await supabase
    .from(
      "household_settings"
    )
    .select(
      "cycle_start_day"
    )
    .eq(
      "household_id",
      householdId
    )
    .maybeSingle();

  return (
    data
      ?.cycle_start_day ??
    1
  );
}

async function saveRecurringVersion({
  supabase,
  householdId,
  userId,
  recurringGroupId,
  effectiveFrom,
  values,
  isActive,
}) {
  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from(
      "recurring_transactions"
    )
    .select(
      "id"
    )
    .eq(
      "household_id",
      householdId
    )
    .eq(
      "recurring_group_id",
      recurringGroupId
    )
    .eq(
      "effective_from",
      effectiveFrom
    )
    .maybeSingle();

  if (existingError) {
    return {
      data: null,
      error:
        existingError,
    };
  }

  const payload = {
    household_id:
      householdId,

    recurring_group_id:
      recurringGroupId,

    effective_from:
      effectiveFrom,

    title:
      values.title,

    amount:
      values.amount,

    transaction_type:
      values.transactionType,

    category_id:
      values.categoryId,

    paid_by_user_id:
      values.paidByUserId,

    due_day:
      values.dueDay,

    memo:
      values.memo,

    is_active:
      isActive,

    allocation_scope:
      values.allocationScope,

    personal_owner_user_id:
      values.personalOwnerUserId,

    created_by:
      userId,
  };

  if (existing) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "recurring_transactions"
      )
      .update(payload)
      .eq(
        "id",
        existing.id
      )
      .select(
        RECURRING_SELECT
      )
      .single();

    return {
      data,
      error,
    };
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "recurring_transactions"
    )
    .insert(payload)
    .select(
      RECURRING_SELECT
    )
    .single();

  return {
    data,
    error,
  };
}

async function getEffectiveRecurringVersion({
  supabase,
  householdId,
  recurringGroupId,
  monthKey,
}) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "recurring_transactions"
    )
    .select(
      RECURRING_SELECT
    )
    .eq(
      "household_id",
      householdId
    )
    .eq(
      "recurring_group_id",
      recurringGroupId
    )
    .lte(
      "effective_from",
      `${monthKey}-01`
    )
    .order(
      "effective_from",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  return {
    data,
    error,
  };
}

async function syncRecurringGeneratedTransaction({
  supabase,
  householdId,
  userId,
  monthKey,
  version,
}) {
  const periodDate =
    `${monthKey}-01`;

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("transactions")
    .select("id")
    .eq(
      "household_id",
      householdId
    )
    .eq(
      "recurring_group_id",
      version
        .recurring_group_id
    )
    .eq(
      "recurrence_period_key",
      periodDate
    )
    .maybeSingle();

  if (existingError) {
    return existingError;
  }

  if (
    !version.is_active
  ) {
    if (!existing) {
      return null;
    }

    const {
      error,
    } = await supabase
      .from("transactions")
      .delete()
      .eq(
        "id",
        existing.id
      )
      .eq(
        "household_id",
        householdId
      );

    return error;
  }

  const cycleStartDay =
    await getCycleStartDay(
      supabase,
      householdId
    );

  const transactionDate =
    getRecurringDate({
      periodKey:
        monthKey,

      cycleStartDay,

      dueDay:
        version.due_day,
    });

  const payload = {
    household_id:
      householdId,

    category_id:
      version.category_id,

    title:
      version.title,

    amount:
      Number(
        version.amount
      ),

    transaction_type:
      version
        .transaction_type,

    transaction_date:
      transactionDate,

    entered_by_user_id:
      userId,

    paid_by_user_id:
      version
        .paid_by_user_id,

    memo:
      version.memo,

    recurring_transaction_id:
      version.id,

    recurring_group_id:
      version
        .recurring_group_id,

    recurrence_period_key:
      periodDate,

    allocation_scope:
      version
        .allocation_scope,

    personal_owner_user_id:
      version
        .personal_owner_user_id,
  };

  if (existing) {
    const {
      error,
    } = await supabase
      .from("transactions")
      .update(payload)
      .eq(
        "id",
        existing.id
      )
      .eq(
        "household_id",
        householdId
      );

    return error;
  }

  const {
    error,
  } = await supabase
    .from("transactions")
    .insert(payload);

  return error;
}


export async function createHouseholdAction(
  formData
) {
  const householdName =
    getFormValue(
      formData,
      "householdName"
    );

  if (!householdName) {
    redirectWithError(
      "家計名を入力してください。"
    );
  }

  const supabase =
    await createClient();

  await requireUser(
    supabase
  );

  const {
    error,
  } = await supabase.rpc(
    "create_household",
    {
      household_name:
        householdName,

      household_currency:
        "JPY",
    }
  );

  if (error) {
    redirectWithError(
      getDatabaseErrorMessage(
        error,
        "家計を作成できませんでした。"
      )
    );
  }

  revalidatePath(
    "/dashboard"
  );

  redirectWithMessage(
    "家計を作成しました。"
  );
}


export async function joinHouseholdAction(
  formData
) {
  const inviteCode =
    getFormValue(
      formData,
      "inviteCode"
    )
      .replace(
        /\s/g,
        ""
      )
      .toUpperCase();

  if (
    !/^[A-Z0-9]{8}$/.test(
      inviteCode
    )
  ) {
    redirectWithError(
      "招待コードは半角英数字8文字です。"
    );
  }

  const supabase =
    await createClient();

  await requireUser(
    supabase
  );

  const {
    error,
  } = await supabase.rpc(
    "join_household",
    {
      household_invite_code:
        inviteCode,
    }
  );

  if (error) {
    redirectWithError(
      getDatabaseErrorMessage(
        error,
        "家計に参加できませんでした。"
      )
    );
  }

  revalidatePath(
    "/dashboard"
  );

  redirectWithMessage(
    "家計に参加しました。"
  );
}


export async function createTransactionAction(
  formData
) {
  const {
    monthKey,
    tab,
  } =
    getReturnState(
      formData
    );

  const parsed =
    parseTransactionForm(
      formData
    );

  if (parsed.error) {
    redirectWithError(
      parsed.error,
      monthKey,
      tab
    );
  }

  const supabase =
    await createClient();

  const {
    userId,
    householdId,
  } =
    await requireHousehold(
      supabase,
      monthKey,
      tab
    );

  const values =
    parsed.values;

  await validateCategory(
    supabase,
    householdId,
    values.categoryId,
    values.transactionType,
    monthKey,
    tab
  );

  await validateTransactionMembers(
    supabase,
    householdId,
    values,
    monthKey,
    tab
  );

  const {
    error,
  } = await supabase
    .from("transactions")
    .insert({
      household_id:
        householdId,

      category_id:
        values.categoryId,

      title:
        values.title,

      amount:
        values.amount,

      transaction_type:
        values.transactionType,

      transaction_date:
        values.transactionDate,

      entered_by_user_id:
        userId,

      paid_by_user_id:
        values.paidByUserId,

      memo:
        values.memo,

      allocation_scope:
        values.allocationScope,

      personal_owner_user_id:
        values.personalOwnerUserId,
    });

  if (error) {
    console.error(
      "Create transaction error:",
      error
    );

    redirectWithError(
      getDatabaseErrorMessage(
        error,
        "家計簿を登録できませんでした。"
      ),
      monthKey,
      tab
    );
  }

  revalidatePath(
    "/dashboard"
  );

  redirectWithMessage(
    values.transactionType ===
      "expense"
      ? "支出を登録しました。"
      : "収入を登録しました。",
    monthKey,
    tab
  );
}


export async function updateTransactionAction(
  formData
) {
  const {
    monthKey,
    tab,
  } =
    getReturnState(
      formData
    );

  const transactionId =
    getFormValue(
      formData,
      "transactionId"
    );

  if (!transactionId) {
    redirectWithError(
      "編集するデータが見つかりません。",
      monthKey,
      tab
    );
  }

  const parsed =
    parseTransactionForm(
      formData
    );

  if (parsed.error) {
    redirectWithError(
      parsed.error,
      monthKey,
      tab
    );
  }

  const supabase =
    await createClient();

  const {
    householdId,
  } =
    await requireHousehold(
      supabase,
      monthKey,
      tab
    );

  const values =
    parsed.values;

  await validateCategory(
    supabase,
    householdId,
    values.categoryId,
    values.transactionType,
    monthKey,
    tab
  );

  await validateTransactionMembers(
    supabase,
    householdId,
    values,
    monthKey,
    tab
  );

  const {
    data,
    error,
  } = await supabase
    .from("transactions")
    .update({
      category_id:
        values.categoryId,

      title:
        values.title,

      amount:
        values.amount,

      transaction_type:
        values.transactionType,

      transaction_date:
        values.transactionDate,

      paid_by_user_id:
        values.paidByUserId,

      memo:
        values.memo,

      allocation_scope:
        values.allocationScope,

      personal_owner_user_id:
        values.personalOwnerUserId,
    })
    .eq(
      "id",
      transactionId
    )
    .eq(
      "household_id",
      householdId
    )
    .select("id")
    .maybeSingle();

  if (
    error ||
    !data
  ) {
    redirectWithError(
      getDatabaseErrorMessage(
        error,
        "登録内容を更新できませんでした。"
      ),
      monthKey,
      tab
    );
  }

  revalidatePath(
    "/dashboard"
  );

  redirectWithMessage(
    "登録内容を更新しました。",
    monthKey,
    tab
  );
}


export async function deleteTransactionAction(
  formData
) {
  const {
    monthKey,
    tab,
  } =
    getReturnState(
      formData
    );

  const transactionId =
    getFormValue(
      formData,
      "transactionId"
    );

  const supabase =
    await createClient();

  const {
    householdId,
  } =
    await requireHousehold(
      supabase,
      monthKey,
      tab
    );

  const {
    error,
  } = await supabase
    .from("transactions")
    .delete()
    .eq(
      "id",
      transactionId
    )
    .eq(
      "household_id",
      householdId
    );

  if (error) {
    redirectWithError(
      getDatabaseErrorMessage(
        error,
        "登録内容を削除できませんでした。"
      ),
      monthKey,
      tab
    );
  }

  revalidatePath(
    "/dashboard"
  );

  redirectWithMessage(
    "登録内容を削除しました。",
    monthKey,
    tab
  );
}


export async function createCategoryAction(
  formData
) {
  const {
    monthKey,
    tab,
  } =
    getReturnState(
      formData
    );

  const name =
    getFormValue(
      formData,
      "categoryName"
    );

  const categoryType =
    getFormValue(
      formData,
      "categoryType"
    );

  const icon =
    Array.from(
      getFormValue(
        formData,
        "categoryIcon"
      ) || "🏷️"
    )
      .slice(0, 4)
      .join("");

  const inputColor =
    getFormValue(
      formData,
      "categoryColor"
    );

  const color =
    /^#[0-9A-Fa-f]{6}$/.test(
      inputColor
    )
      ? inputColor
      : "#64748B";

  if (!name) {
    redirectWithError(
      "カテゴリ名を入力してください。",
      monthKey,
      tab
    );
  }

  if (
    categoryType !==
      "expense" &&
    categoryType !==
      "income"
  ) {
    redirectWithError(
      "カテゴリの種類を選択してください。",
      monthKey,
      tab
    );
  }

  const supabase =
    await createClient();

  const {
    userId,
    householdId,
  } =
    await requireHousehold(
      supabase,
      monthKey,
      tab
    );

  const {
    error,
  } = await supabase
    .from("categories")
    .insert({
      household_id:
        householdId,

      name,

      category_type:
        categoryType,

      icon,

      color,

      is_active:
        true,

      created_by:
        userId,
    });

  if (error) {
    redirectWithError(
      getDatabaseErrorMessage(
        error,
        "カテゴリを追加できませんでした。"
      ),
      monthKey,
      tab
    );
  }

  revalidatePath(
    "/dashboard"
  );

  redirectWithMessage(
    "カテゴリを追加しました。",
    monthKey,
    tab
  );
}


export async function toggleCategoryAction(
  formData
) {
  const {
    monthKey,
    tab,
  } =
    getReturnState(
      formData
    );

  const categoryId =
    getFormValue(
      formData,
      "categoryId"
    );

  const supabase =
    await createClient();

  const {
    householdId,
  } =
    await requireHousehold(
      supabase,
      monthKey,
      tab
    );

  const {
    data,
    error,
  } = await supabase
    .from("categories")
    .select(
      "id, name, is_active"
    )
    .eq(
      "id",
      categoryId
    )
    .eq(
      "household_id",
      householdId
    )
    .maybeSingle();

  if (
    error ||
    !data
  ) {
    redirectWithError(
      "カテゴリが見つかりません。",
      monthKey,
      tab
    );
  }

  const {
    error:
      updateError,
  } = await supabase
    .from("categories")
    .update({
      is_active:
        !data.is_active,
    })
    .eq(
      "id",
      categoryId
    )
    .eq(
      "household_id",
      householdId
    );

  if (updateError) {
    redirectWithError(
      "カテゴリを変更できませんでした。",
      monthKey,
      tab
    );
  }

  revalidatePath(
    "/dashboard"
  );

  redirectWithMessage(
    !data.is_active
      ? `${data.name}を表示しました。`
      : `${data.name}を非表示にしました。`,
    monthKey,
    tab
  );
}


export async function updateHouseholdSettingsAction(
  formData
) {
  const {
    monthKey,
  } =
    getReturnState(
      formData
    );

  const cycleStartDay =
    parseIntegerInRange(
      getFormValue(
        formData,
        "cycleStartDay"
      ),
      1,
      28
    );

  const defaultSavingsGoal =
    parseNonNegativeAmount(
      getFormValue(
        formData,
        "defaultSavingsGoal"
      )
    );

  if (
    cycleStartDay === null ||
    defaultSavingsGoal ===
      null
  ) {
    redirectWithError(
      "管理設定を正しく入力してください。",
      monthKey,
      "management"
    );
  }

  const supabase =
    await createClient();

  const {
    householdId,
  } =
    await requireHousehold(
      supabase,
      monthKey,
      "management"
    );

  const {
    error,
  } = await supabase
    .from(
      "household_settings"
    )
    .upsert(
      {
        household_id:
          householdId,

        cycle_start_day:
          cycleStartDay,

        default_savings_goal:
          defaultSavingsGoal,

        timezone:
          "Asia/Tokyo",
      },
      {
        onConflict:
          "household_id",
      }
    );

  if (error) {
    redirectWithError(
      getDatabaseErrorMessage(
        error,
        "管理設定を保存できませんでした。"
      ),
      monthKey,
      "management"
    );
  }

  revalidatePath(
    "/dashboard"
  );

  redirectWithMessage(
    "管理設定を保存しました。",
    monthKey,
    "management"
  );
}


export async function saveMonthlyPlanAction(
  formData
) {
  const {
    monthKey,
  } =
    getReturnState(
      formData
    );

  const savingsGoal =
    parseNonNegativeAmount(
      getFormValue(
        formData,
        "savingsGoal"
      )
    );

  if (
    !monthKey ||
    savingsGoal === null
  ) {
    redirectWithError(
      "貯金目標を正しく入力してください。",
      monthKey,
      "management"
    );
  }

  const supabase =
    await createClient();

  const {
    userId,
    householdId,
  } =
    await requireHousehold(
      supabase,
      monthKey,
      "management"
    );

  const {
    error,
  } = await supabase
    .from(
      "monthly_plans"
    )
    .upsert(
      {
        household_id:
          householdId,

        period_key:
          `${monthKey}-01`,

        savings_goal:
          savingsGoal,

        created_by:
          userId,
      },
      {
        onConflict:
          "household_id,period_key",
      }
    );

  if (error) {
    redirectWithError(
      getDatabaseErrorMessage(
        error,
        "貯金目標を保存できませんでした。"
      ),
      monthKey,
      "management"
    );
  }

  revalidatePath(
    "/dashboard"
  );

  redirectWithMessage(
    "今期の貯金目標を保存しました。",
    monthKey,
    "management"
  );
}


export async function createRecurringTransactionAction(
  formData
) {
  const {
    monthKey,
  } =
    getReturnState(
      formData
    );

  if (!monthKey) {
    redirectWithError(
      "適用開始月が正しくありません。",
      "",
      "management"
    );
  }

  const parsed =
    parseRecurringForm(
      formData
    );

  if (parsed.error) {
    redirectWithError(
      parsed.error,
      monthKey,
      "management"
    );
  }

  const supabase =
    await createClient();

  const {
    userId,
    householdId,
  } =
    await requireHousehold(
      supabase,
      monthKey,
      "management"
    );

  const values =
    parsed.values;

  await validateCategory(
    supabase,
    householdId,
    values.categoryId,
    values.transactionType,
    monthKey,
    "management"
  );

  await validateTransactionMembers(
    supabase,
    householdId,
    values,
    monthKey,
    "management"
  );

  const recurringGroupId =
    crypto.randomUUID();

  const {
    data: version,
    error,
  } =
    await saveRecurringVersion({
      supabase,
      householdId,
      userId,
      recurringGroupId,

      effectiveFrom:
        `${monthKey}-01`,

      values,
      isActive:
        true,
    });

  if (
    error ||
    !version
  ) {
    redirectWithError(
      getDatabaseErrorMessage(
        error,
        "固定収支を追加できませんでした。"
      ),
      monthKey,
      "management"
    );
  }

  const syncError =
    await syncRecurringGeneratedTransaction({
      supabase,
      householdId,
      userId,
      monthKey,
      version,
    });

  if (syncError) {
    console.error(
      "Recurring sync error:",
      syncError
    );
  }

  revalidatePath(
    "/dashboard"
  );

  redirectWithMessage(
    `${monthKey}期から固定収支を追加しました。`,
    monthKey,
    "management"
  );
}


export async function updateRecurringTransactionAction(
  formData
) {
  const {
    monthKey,
  } =
    getReturnState(
      formData
    );

  const recurringGroupId =
    getFormValue(
      formData,
      "recurringGroupId"
    );

  if (
    !monthKey ||
    !recurringGroupId
  ) {
    redirectWithError(
      "編集する固定収支が見つかりません。",
      monthKey,
      "management"
    );
  }

  const parsed =
    parseRecurringForm(
      formData
    );

  if (parsed.error) {
    redirectWithError(
      parsed.error,
      monthKey,
      "management"
    );
  }

  const supabase =
    await createClient();

  const {
    userId,
    householdId,
  } =
    await requireHousehold(
      supabase,
      monthKey,
      "management"
    );

  const values =
    parsed.values;

  await validateCategory(
    supabase,
    householdId,
    values.categoryId,
    values.transactionType,
    monthKey,
    "management"
  );

  await validateTransactionMembers(
    supabase,
    householdId,
    values,
    monthKey,
    "management"
  );

  const {
    data: effective,
    error:
      effectiveError,
  } =
    await getEffectiveRecurringVersion({
      supabase,
      householdId,
      recurringGroupId,
      monthKey,
    });

  if (
    effectiveError ||
    !effective
  ) {
    redirectWithError(
      "固定収支が見つかりません。",
      monthKey,
      "management"
    );
  }

  const {
    data: version,
    error,
  } =
    await saveRecurringVersion({
      supabase,
      householdId,
      userId,
      recurringGroupId,

      effectiveFrom:
        `${monthKey}-01`,

      values,

      isActive:
        effective.is_active,
    });

  if (
    error ||
    !version
  ) {
    redirectWithError(
      getDatabaseErrorMessage(
        error,
        "固定収支を更新できませんでした。"
      ),
      monthKey,
      "management"
    );
  }

  const syncError =
    await syncRecurringGeneratedTransaction({
      supabase,
      householdId,
      userId,
      monthKey,
      version,
    });

  if (syncError) {
    console.error(
      "Recurring sync error:",
      syncError
    );
  }

  revalidatePath(
    "/dashboard"
  );

  redirectWithMessage(
    `${monthKey}期以降の固定収支を変更しました。`,
    monthKey,
    "management"
  );
}


export async function toggleRecurringTransactionAction(
  formData
) {
  const {
    monthKey,
  } =
    getReturnState(
      formData
    );

  const recurringGroupId =
    getFormValue(
      formData,
      "recurringGroupId"
    );

  const supabase =
    await createClient();

  const {
    userId,
    householdId,
  } =
    await requireHousehold(
      supabase,
      monthKey,
      "management"
    );

  const {
    data: effective,
    error:
      effectiveError,
  } =
    await getEffectiveRecurringVersion({
      supabase,
      householdId,
      recurringGroupId,
      monthKey,
    });

  if (
    effectiveError ||
    !effective
  ) {
    redirectWithError(
      "固定収支が見つかりません。",
      monthKey,
      "management"
    );
  }

  const values = {
    title:
      effective.title,

    amount:
      Number(
        effective.amount
      ),

    transactionType:
      effective
        .transaction_type,

    categoryId:
      effective.category_id,

    paidByUserId:
      effective
        .paid_by_user_id,

    dueDay:
      effective.due_day,

    memo:
      effective.memo,

    allocationScope:
      effective
        .allocation_scope,

    personalOwnerUserId:
      effective
        .personal_owner_user_id,
  };

  const nextActive =
    !effective.is_active;

  const {
    data: version,
    error,
  } =
    await saveRecurringVersion({
      supabase,
      householdId,
      userId,
      recurringGroupId,

      effectiveFrom:
        `${monthKey}-01`,

      values,
      isActive:
        nextActive,
    });

  if (
    error ||
    !version
  ) {
    redirectWithError(
      "固定収支の状態を変更できませんでした。",
      monthKey,
      "management"
    );
  }

  const syncError =
    await syncRecurringGeneratedTransaction({
      supabase,
      householdId,
      userId,
      monthKey,
      version,
    });

  if (syncError) {
    console.error(
      "Recurring sync error:",
      syncError
    );
  }

  revalidatePath(
    "/dashboard"
  );

  redirectWithMessage(
    nextActive
      ? `${monthKey}期から固定収支を再開しました。`
      : `${monthKey}期から固定収支を停止しました。`,
    monthKey,
    "management"
  );
}