import {
  NextResponse,
} from "next/server";
import {
  createClient,
} from "@/lib/supabase/server";

function isValidMonthKey(
  value
) {
  return (
    typeof value ===
      "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(
      value
    )
  );
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

function selectEffectiveVersions(
  rows
) {
  const versionMap =
    new Map();

  for (
    const row of rows
  ) {
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

export async function POST(
  request
) {
  try {
    const body =
      await request.json();

    const monthKey =
      typeof body
        ?.monthKey ===
        "string"
        ? body.monthKey
        : "";

    if (
      !isValidMonthKey(
        monthKey
      )
    ) {
      return NextResponse.json(
        {
          error:
            "家計期間が正しくありません。",
        },
        {
          status: 400,
        }
      );
    }

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
      return NextResponse.json(
        {
          error:
            "ログインが必要です。",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: membership,
      error:
        membershipError,
    } = await supabase
      .from(
        "household_members"
      )
      .select(
        "household_id"
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

    if (
      membershipError ||
      !membership
        ?.household_id
    ) {
      return NextResponse.json(
        {
          error:
            "家計情報を取得できませんでした。",
        },
        {
          status: 403,
        }
      );
    }

    const householdId =
      membership
        .household_id;

    const [
      settingsResult,
      versionsResult,
      existingResult,
    ] = await Promise.all([
      supabase
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
        .maybeSingle(),

      supabase
        .from(
          "recurring_transactions"
        )
        .select(`
          id,
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
          personal_owner_user_id
        `)
        .eq(
          "household_id",
          householdId
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
        ),

      supabase
        .from("transactions")
        .select(
          "recurring_group_id"
        )
        .eq(
          "household_id",
          householdId
        )
        .eq(
          "recurrence_period_key",
          `${monthKey}-01`
        )
        .not(
          "recurring_group_id",
          "is",
          null
        ),
    ]);

    if (
      settingsResult.error ||
      versionsResult.error ||
      existingResult.error
    ) {
      console.error(
        "Recurring ensure query error:",
        {
          settings:
            settingsResult.error,

          versions:
            versionsResult.error,

          existing:
            existingResult.error,
        }
      );

      return NextResponse.json(
        {
          error:
            "固定収支を取得できませんでした。",
        },
        {
          status: 500,
        }
      );
    }

    const cycleStartDay =
      settingsResult.data
        ?.cycle_start_day ??
      1;

    const effectiveVersions =
      selectEffectiveVersions(
        versionsResult.data ??
          []
      );

    const existingGroups =
      new Set(
        (
          existingResult.data ??
          []
        ).map(
          (row) =>
            row.recurring_group_id
        )
      );

    let inserted = 0;

    for (
      const version of
      effectiveVersions
    ) {
      if (
        !version.is_active ||
        existingGroups.has(
          version
            .recurring_group_id
        )
      ) {
        continue;
      }

      const transactionDate =
        getRecurringDate({
          periodKey:
            monthKey,

          cycleStartDay,

          dueDay:
            version.due_day,
        });

      const {
        error,
      } = await supabase
        .from("transactions")
        .insert({
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
            `${monthKey}-01`,

          allocation_scope:
            version
              .allocation_scope,

          personal_owner_user_id:
            version
              .personal_owner_user_id,
        });

      if (!error) {
        inserted += 1;
        continue;
      }

      if (
        error.code !==
        "23505"
      ) {
        console.error(
          "Recurring insert error:",
          error
        );
      }
    }

    return NextResponse.json({
      inserted,
    });
  } catch (error) {
    console.error(
      "Recurring ensure route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "固定収支の反映に失敗しました。",
      },
      {
        status: 500,
      }
    );
  }
}