# 天九扑克牌 - APK构建指南

## 环境要求

- Node.js 18+
- Android Studio (最新稳定版)
- Android SDK (API 33+)
- Java 17

## 构建步骤

### 1. 安装依赖

```bash
cd tianjiu-apk
npm install
```

### 2. 构建静态网页

```bash
npm run build
```

这会生成 `out/` 目录，包含所有静态文件。

### 3. 初始化Capacitor Android项目

```bash
npx cap add android
```

### 4. 同步网页到Android项目

```bash
npx cap sync android
```

### 5. 用Android Studio打开并构建APK

```bash
npx cap open android
```

在Android Studio中：
1. 等待Gradle同步完成
2. 点击菜单 `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
3. 生成的APK位于：`android/app/build/outputs/apk/debug/app-debug.apk`

### 6. 签名发布版（可选）

如需发布，在Android Studio中：
1. `Build` → `Generate Signed Bundle / APK`
2. 选择APK，创建或选择签名密钥
3. 选择release构建类型

## 直接运行调试

连接手机或启动模拟器后：

```bash
npx cap run android
```

## 项目结构

```
tianjiu-apk/
├── app/
│   ├── page.tsx          # 游戏主页面（React组件）
│   ├── layout.tsx        # 根布局
│   └── globals.css       # 全局样式
├── lib/
│   └── game.ts           # 游戏核心逻辑
├── out/                  # 构建输出（静态网页）
├── android/              # Capacitor生成的Android项目
├── package.json
├── next.config.js
├── capacitor.config.ts
└── README.md
```

## 注意事项

1. **首次构建**：Android Studio会自动下载Gradle和依赖，请保持网络畅通
2. **真机调试**：需要在手机设置中开启"开发者选项"和"USB调试"
3. **安装APK**：如果提示"禁止安装未知来源应用"，请在设置中允许
4. **性能**：游戏完全在本地运行，无需网络，所有AI计算在设备端完成

## 游戏规则速查

- **32张牌**：黑牌22张（♠♣ K/Q/J/9/7/6/5/4/3/2/A），红牌10张（♥♦ K/Q/J/9 + ♦10 + ♥8）
- **文至尊**：♠A + ♣A（最大牌）
- **武至尊**：♦10 + ♥8
- **四大贺**：4张同点数且2黑2红（K/Q/J/9）
- **决胜轮**：某玩家出完手牌时触发，按剩余分牌结算
- **尊钱/贺钱**：出至尊或四大贺时即时收取的奖励分
