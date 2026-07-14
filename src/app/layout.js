import "./globals.css";

export const metadata = {
  title: {
    default: "ふたり家計簿",
    template: "%s | ふたり家計簿",
  },
  description:
    "二人で支出や収入を共有できる家計簿アプリ",
};

export default function RootLayout({
  children,
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}