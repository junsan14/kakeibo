import Link from "next/link";
import {
  loginAction,
} from "@/app/auth/actions";
import styles from "./page.module.css";

export const metadata = {
  title: "ログイン | ふたり家計簿",
};

export default async function LoginPage({
  searchParams,
}) {
  const params = await searchParams;

  const error =
    typeof params?.error === "string"
      ? params.error
      : "";

  const message =
    typeof params?.message === "string"
      ? params.message
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
          <h2>おかえりなさい</h2>
          <p>
            メールアドレスとパスワードで
            ログインしてください。
          </p>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {message && (
          <div className={styles.successMessage}>
            {message}
          </div>
        )}

        <form
          action={loginAction}
          className={styles.form}
        >
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
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="submit"
            className={styles.primaryButton}
          >
            ログイン
          </button>
        </form>

        <p className={styles.switchText}>
          アカウントを持っていませんか？
          <Link href="/signup">
            新規登録
          </Link>
        </p>
      </section>
    </main>
  );
}