# HorroLive v4 Concept Assets

このフォルダの画像は、実装用スプライトを制作するための**ディレクション原画**です。高解像度画像を縮小してゲームへ直接投入しません。

| Asset | Status | Use |
| --- | --- | --- |
| [character-direction-v4.png](character-direction-v4.png) | approved | 主人公の比率、装備、姿勢、感情 |
| [hospital-props-direction-v4.png](hospital-props-direction-v4.png) | approved | 病院小物の形、年代、素材、色 |
| [observer-direction-v4-v2.png](observer-direction-v4-v2.png) | approved | 観測者のTier 0–3、遮蔽、距離 |
| [observer-direction-v4.png](observer-direction-v4.png) | superseded | Tier 0に人物が見えすぎる初稿 |

各PNGの生成条件は同名の`.prompt.md`へ保存しています。すべて組み込み`image_gen`で制作し、元の企画ボードはstyle／mood referenceとしてのみ使用しました。

ランタイム化は [Art & Asset Bible v4](../../docs/ART_ASSET_BIBLE_V4.md) と [manifest.v4.json](../manifest.v4.json) に従い、次を実施します。

1. Aseprite等で指定gridへ描き直す。
2. role paletteへ減色する。
3. 輪郭、pivot、socket、occluderを整数pxで整える。
4. Mainと遅延PIPの両方で検品する。
5. manifest statusを`runtime-ready`へ更新する。
