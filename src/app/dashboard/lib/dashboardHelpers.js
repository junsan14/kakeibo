const moneyFormatter =
  new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  });

const dateFormatter =
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export function formatMoney(value) {
  return moneyFormatter.format(
    Number(value) || 0
  );
}

export function formatCompactMoney(value) {
  const number =
    Number(value) || 0;

  if (
    Math.abs(number) >=
    1000000
  ) {
    return `¥${(
      number / 1000000
    ).toFixed(1)}M`;
  }

  if (
    Math.abs(number) >=
    10000
  ) {
    return `¥${Math.round(
      number / 1000
    )}千`;
  }

  return `¥${number.toLocaleString(
    "ja-JP"
  )}`;
}

export function formatDate(value) {
  const date = new Date(
    `${value}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return dateFormatter.format(date);
}

export function getScopeOptions(
  members
) {
  return [
    {
      key: "shared",
      label: "2人のもの",
      shortLabel: "共有",
    },

    ...members.map((member) => {
      const displayName =
        member.profile
          ?.display_name ??
        "ユーザー";

      return {
        key: member.user_id,
        label: `${displayName}個人`,
        shortLabel: displayName,
      };
    }),
  ];
}

export function getTransactionScopeKey(
  transaction
) {
  if (
    transaction.allocation_scope ===
      "personal" &&
    transaction.personal_owner_user_id
  ) {
    return (
      transaction.personal_owner_user_id
    );
  }

  return "shared";
}

export function createCategoryDataKey(
  categoryId
) {
  return `category_${String(
    categoryId
  ).replaceAll("-", "_")}`;
}