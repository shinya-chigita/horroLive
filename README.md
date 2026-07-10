<div align="center">

# LIVE

**視聴者は、味方とは限らない。**

廃病院から生配信する、ブラウザ完結型の2Dホラーアドベンチャー。

</div>

## About

`LIVE` は、横スクロール探索と配信画面のUIを組み合わせた短編ホラーゲームです。
プレイヤーは封鎖された「白鳴霊園付属病棟」を探索し、配信カメラにだけ映る怪異を撮影しながら、手がかりを集めて非常口を目指します。

同時接続数はスコアであると同時に、呪いを増幅するリスクでもあります。集めた証拠、撮影した怪異、最終的な視聴者数によって結末が変化します。

## Features

- Canvasで描画する2Dサイドスクロール探索
- 肉眼と配信カメラで見え方が異なる怪異
- 状況に反応する疑似ライブコメント
- 懐中電灯、バッテリー、TENSION、体力の管理
- Web Audio APIによる動的な環境音・心拍・効果音
- 証拠回収と怪異撮影による複数エンディング
- キーボード・マウス・タッチ操作対応
- レスポンシブUI、低モーション設定への配慮

## Controls

| 操作 | キー |
| --- | --- |
| 左右移動 | `A` / `D` または `←` / `→` |
| 走る | `Shift` |
| しゃがむ | `S` / `Ctrl` / `↓` |
| 懐中電灯 | `F` |
| 調べる | `E` |
| 怪異を撮影 | `Space` またはカメラの `CAPTURE` |

ゲーム画面にはタッチ操作用のオンスクリーンボタンも表示されます。

## Tech stack

- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- Lucide React
- HTML Canvas
- Web Audio API
- Cloudflare Pages
- GitHub Actions

## Run locally

Node.js 22 以降を推奨します。

```bash
npm install
npm run dev
```

開発サーバーは `http://localhost:3000` で起動します。
このアプリは完全なクライアントサイド構成のため、環境変数やAPIキーは不要です。

## Quality checks

```bash
npm run lint
npm run build
```

Pull Request と `main` へのpushでは、GitHub Actionsが型チェックと本番ビルドを実行します。

## Deploy

Cloudflare Pagesへのデプロイは `.github/workflows/deploy.yml` で自動化されています。

- `main` へのpush: production deploy
- Pull Request: branch preview deploy

初回のみ、リポジトリのActions secretsに次の値を登録してください。

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

本番URLは `https://horrolive.pages.dev` を想定しています。

## Project structure

```text
src/
├── App.tsx                         # ゲーム全体の状態・進行・画面構成
├── components/
│   ├── TitleScreen.tsx             # タイトル・ゲーム導入
│   ├── StreamHeader.tsx            # 配信情報とステータス
│   ├── MainGameView.tsx            # Canvas描画・移動・探索
│   ├── PipCamera.tsx               # 配信カメラ・怪異撮影
│   ├── LiveChat.tsx                # 疑似ライブコメント
│   └── InvestigationJournal.tsx    # アイテム・ログ・撮影記録
├── utils/audio.ts                  # Web Audio APIによる動的音響
├── types.ts                        # ゲーム型定義とチャプター情報
└── index.css                       # Tailwindと共通演出
```

## Content warning

強い光の点滅、大音量、ジャンプスケア、恐怖表現を含みます。光刺激や恐怖表現が苦手な方はプレイをお控えください。
