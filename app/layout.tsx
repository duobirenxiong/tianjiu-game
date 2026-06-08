export const metadata = {
  title: '天九扑克牌',
  description: '天九扑克牌对战游戏',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
