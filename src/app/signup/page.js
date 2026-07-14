import Link from "next/link";
import {
  signupAction,
} from "@/app/auth/actions";
import styles from "../login/page.module.css";

export const metadata = {
  title: "新規登録 | ふたり家計簿",
};

export default async function SignupPage({
  searchParams,
}) {
  const params = await searchParams;

  const error =
    typeof params?.error === "string"
      ? params.error
      : "";

  return (
    <main className={styles.page}>
      <section className={styles.authCard}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>
            ¥
          </span>

          <div>
            <p className={styles.logoSub}>
              二人で管理する
            </p>

            <h1 className={styles.logoTitle}>
              ふたり家計簿
            </h1>
          </div>
        </div>

        <div className={styles.heading}>
          <h2>アカウント作成</h2>

          <p>
            二人それぞれ別のアカウントを
            作成します。
          </p>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <form
          action={signupAction}
          className={styles.form}
        >
          <label className={styles.field}>
            <span>表示名</span>

            <input
              type="text"
              name="displayName"
              placeholder="Jun"
              autoComplete="name"
              maxLength={50}
              required
            />
          </label>

          <label className={styles.field}>
            <span>メールアドレス</span>

            <input
              type="email"
              name="email"
              placeholder="example@email.com"
              autoComplete="email"
              required
            />
          </label>

          <label className={styles.field}>
            <span>パスワード</span>

            <input
              type="password"
              name="password"
              placeholder="8文字以上"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label className={styles.field}>
            <span>確認用パスワード</span>

            <input
              type="password"
              name="passwordConfirmation"
              placeholder="もう一度入力"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <button
            type="submit"
            className={styles.primaryButton}
          >
            アカウントを作成
          </button>
        </form>

        <p className={styles.switchText}>
          すでにアカウントがありますか？
          <Link href="/login">
            ログイン
          </Link>
        </p>
      </section>
    </main>
  );
}