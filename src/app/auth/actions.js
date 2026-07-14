"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData, key) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function createMessageUrl(path, type, message) {
  const params = new URLSearchParams({
    [type]: message,
  });

  return `${path}?${params.toString()}`;
}

function getAuthErrorMessage(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage;
  }

  const errorCode =
    typeof error.code === "string"
      ? error.code
      : "";

  const errorMessage =
    typeof error.message === "string"
      ? error.message
      : "";

  switch (errorCode) {
    case "user_already_exists":
    case "email_exists":
      return "このメールアドレスはすでに登録されています。";

    case "weak_password":
      return "パスワードの強度が不足しています。";

    case "email_address_invalid":
      return "メールアドレスの形式が正しくありません。";

    case "over_email_send_rate_limit":
      return "確認メールの送信回数が上限に達しました。しばらくしてから再度お試しください。";

    case "signup_disabled":
      return "現在、新規アカウント登録が無効になっています。";

    case "unexpected_failure":
      return "アカウント作成中にデータベースエラーが発生しました。Supabaseのログを確認してください。";

    default:
      return errorMessage || fallbackMessage;
  }
}

function logAuthError(label, error) {
  console.error(label, {
    name:
      typeof error?.name === "string"
        ? error.name
        : null,
    message:
      typeof error?.message === "string"
        ? error.message
        : null,
    code:
      typeof error?.code === "string"
        ? error.code
        : null,
    status:
      typeof error?.status === "number"
        ? error.status
        : null,
  });
}

export async function signupAction(formData) {
  const displayName = getFormValue(
    formData,
    "displayName"
  );

  const email = getFormValue(
    formData,
    "email"
  ).toLowerCase();

  const password = getFormValue(
    formData,
    "password"
  );

  const passwordConfirmation = getFormValue(
    formData,
    "passwordConfirmation"
  );

  if (!displayName) {
    redirect(
      createMessageUrl(
        "/signup",
        "error",
        "名前を入力してください。"
      )
    );
  }

  if (!email) {
    redirect(
      createMessageUrl(
        "/signup",
        "error",
        "メールアドレスを入力してください。"
      )
    );
  }

  if (password.length < 8) {
    redirect(
      createMessageUrl(
        "/signup",
        "error",
        "パスワードは8文字以上で入力してください。"
      )
    );
  }

  if (password !== passwordConfirmation) {
    redirect(
      createMessageUrl(
        "/signup",
        "error",
        "確認用パスワードが一致しません。"
      )
    );
  }

  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

  if (error) {
    logAuthError(
      "Supabase signup error:",
      error
    );

    redirect(
      createMessageUrl(
        "/signup",
        "error",
        getAuthErrorMessage(
          error,
          "アカウントを作成できませんでした。"
        )
      )
    );
  }

  if (data?.session) {
    redirect("/dashboard");
  }

  redirect(
    createMessageUrl(
      "/login",
      "message",
      "確認メールを送信しました。メール内のリンクを開いてください。"
    )
  );
}

export async function loginAction(formData) {
  const email = getFormValue(
    formData,
    "email"
  ).toLowerCase();

  const password = getFormValue(
    formData,
    "password"
  );

  if (!email || !password) {
    redirect(
      createMessageUrl(
        "/login",
        "error",
        "メールアドレスとパスワードを入力してください。"
      )
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    logAuthError(
      "Supabase login error:",
      error
    );

    redirect(
      createMessageUrl(
        "/login",
        "error",
        getAuthErrorMessage(
          error,
          "メールアドレスまたはパスワードが正しくありません。"
        )
      )
    );
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut({
    scope: "local",
  });

  if (error) {
    logAuthError(
      "Supabase logout error:",
      error
    );
  }

  redirect(
    createMessageUrl(
      "/login",
      "message",
      "ログアウトしました。"
    )
  );
}