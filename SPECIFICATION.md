# 脊椎OVFダッシュボード 仕様書

本書はリポジトリの実装から起こした仕様書である。研究利用の運用は RESEARCH.md、開発規約は CLAUDE.md を参照。

---

## 1. システム概要

### 目的
Google Sheets（Googleフォーム＋手入力）に蓄積された骨粗鬆症性椎体骨折（OVF: Osteoporotic Vertebral Fracture）症例データを、施設の疫学把握・在院日数比較・相関分析・臨床研究用データ出力に供する院内ダッシュボード。整形外科・脊椎外科の医師・研究者が、匿名化ID症例の記述統計・仮説探索・CSV出力を行う。

### 利用者
整形外科/脊椎外科医、臨床研究者（共通アカウントによるログイン）。

### データフロー（テキスト構成図）

```
Google Sheets（フォーム+手入力）
    ↓
Google Apps Script（doGet エンドポイント、JSON API）
    ↓ HTTP GET
NEXT_PUBLIC_GAS_API_URL（環境変数）
    ↓ JSON 配列（PatientRecord[]）
Next.js SSR（page.tsx、revalidate 3600秒）
    ↓ fetchPatients() → 後処理・型補正
Dashboard.tsx（クライアント）
    ↓ derivePatient() ×患者数（派生計算）
DerivedPatient[]（全患者・派生フィールド含）
    ↓ useMemo（グローバルフィルタ）
filtered（年フィルタ・治療群フィルタ適用後）
    ↓ 3タブ（概況 / 相関分析 / 症例一覧）
```

---

## 2. 技術スタック

| 項目 | バージョン | 備考 |
|------|-----------|------|
| Next.js | 16.0.7 | App Router（SSR+ISR） |
| React | 19.2.0 | - |
| TypeScript | 5 | strict 設定 |
| Tailwind CSS | 4 | PostCSS 4、globals.css CSS-first、常時ダークテーマ |
| Recharts | 3.4.1 | ダークテーマは chartTheme.tsx の共有 props で適用 |
| lucide-react | 0.554.0 | アイコン（LogOut 他） |
| clsx | 2.1.1 | クラス名結合 |
| tailwind-merge | 3.4.0 | Tailwind クラスのオーバーライド |
| ESLint | 9 | eslint-config-next 対応 |

統計エンジンは外部ライブラリなし。`src/lib/stats.ts`内で Lanczos logGamma、正則化不完全ベータ（連分数法）、不完全ガンマ関数を実装。

---

## 3. 画面仕様

### 3.1 共通要素

#### ログイン画面（/login）
- **画面**: 日本語テキスト、ダークテーマ（bg-slate-900、border-slate-800）
- **入力**: ID フィールド（name=username）、パスワードフィールド（name=password）
- **検証**: 環境変数 `AUTH_USER`・`AUTH_PASS` と フォーム値を strcmp 比較
- **成功時**: Cookie `session=authenticated`（httpOnly、secure（本番環境），maxAge 604,800秒=7日、path=/）をセット → リダイレクト（/）
- **失敗時**: エラーメッセージをフォーム上部に表示（rose 系警告ボックス）
- **実装**: `src/app/login/page.tsx`（Server Action `login()` @ `src/app/actions/auth.ts`）

#### ミドルウェア（route 保護）
- **matcher**: `/((?!api|_next/static|_next/image|favicon.ico).*)`（API・静的アセット除外）
- **ロジック**: 
  - cookie `session` 無し＋/login 以外 → /login にリダイレクト
  - cookie `session` あり＋/login → / にリダイレクト
- **実装**: `src/middleware.ts`

#### ヘッダー（全タブ共通）
- **題目**: h1「脊椎OVFダッシュボード」（text-xl md:text-2xl font-bold）
- **サブテキスト**: 「骨粗鬆症性椎体骨折の疫学・治療・転帰」
- **表示件数**: 「表示中 **n** 件 / 全 **m** 件」（filtered.length vs derived.length）
- **年フィルタ**: Select（label「年」、オプション「すべて」+ タイムスタンプ年の降順）、selectedYear state
- **治療群フィルタ**: トグル群（全体/手術/保存、badge スタイル）、treatmentFilter state
- **ログアウト**: LogOut アイコンボタン、Server Action `logout()`（cookie 削除 → /login リダイレクト）
- **フィルタ範囲**: 全3タブに共通適用

#### タブ バー（UI コンポーネント）
- **タブ**: 概況 / 相関分析 / 症例一覧
- **ロジック**: アクティブタブのみマウント（条件レンダリング。多数の ResponsiveContainer 同時描画を回避）
- **状態**: tab state（Dashboard.tsx）、タブ切替時に分析設定・テーブル状態は保持
- **実装**: `src/components/ui/TabBar.tsx`（TabKey = "overview" | "analysis" | "patients"）

### 3.2 概況タブ（Overview）

**レイアウト**: セクション積み上げ（上から KPI行 → 疫学 → 在院日数 → 転帰）

#### KPI 行（KpiRow.tsx）
| KPI 項目 | 計算式 | 表示内容 |
|---------|------|--------|
| 総症例数 | filtered.length | 数値 |
| 手術件数 | treatmentGroup==='surgery' の件数 | 件数＋「全体の x%」 |
| 保存件数 | treatmentGroup==='conservative' の件数 | 件数＋「全体の x%」 |
| 平均年齢±SD | mean(ageNum) ± sd(ageNum)（null 除外） | xx.x ± y.y 歳（年齢記載件数を併記） |
| 女性比率 | 女性件数 ÷ 性別記載あり件数 | %（内訳を併記） |
| 在院日数ワイドカード | 手術/保存それぞれの losDays（null 除外）の中央値[IQR]・平均±SD | 両群並記＋Mann–Whitney U 検定の p 値バッジ（検定不能時は「データ不足」） |

#### 疫学セクション（EpidemiologySection.tsx）

| チャート | 説明 |
|---------|------|
| **年齢分布（性別内訳）** | X=年齢層（<60/60-69/70-79/80-89/90+）、積み上げ縦棒（女性/男性）。年齢・性別未記載は除外し件数を注記 |
| **骨折椎体レベル** | 縦棒、X=T1〜L5 の17椎体（解剖学的順に全椎体表示）、胸椎=violet/腰椎=cyan。多発骨折は各椎体を1件として集計、レベル不明は件数注記 |
| **受傷機転** | ドーナツ（転倒=amber / 転倒なし=emerald / その他=slate）、%ラベル |
| **OF分類** | 縦棒（Type 2/3/4 等を名称順）。未記載は「不明」として末尾に追加 |
| **月別症例数推移** | 積み上げ縦棒（手術/保存/その他）、monthKey（YYYY-MM）昇順 |
| **骨粗鬆症治療歴** | 横棒（薬剤名別の件数、上位7件）。「なし/無/未治療/None」は「なし」に正規化 |

全チャートはダークテーマ（chartTheme.tsx：grid=#1e293b, axisLine=#334155, tick=#94a3b8, label=#cbd5e1）、isAnimationActive=false。

#### 在院日数セクション（LosSection.tsx）

| チャート | 説明 |
|---------|------|
| **在院日数の分布** | 7日刻みビンのヒストグラム（最大12ビン、超過は最終ビン「77+」に集約）。手術(rose)/保存(sky)のグループ縦棒。サブタイトルに両群の中央値、バッジに Mann–Whitney U の p 値 |
| **術式別術後在院日数** | 縦棒、術式ごとの postOpDays 中央値（日）。ツールチップに n を表示 |
| **年齢層別在院日数** | グループ縦棒（手術/保存）、年齢層ごとの losDays 中央値（日） |

#### 転帰セクション（OutcomeSection.tsx）

| 項目 | 説明 |
|------|------|
| **退院先** | 横棒（件数降順、記載のある症例のみ） |
| **退院時歩行能力** | 縦棒（独歩/杖/歩行器/車椅子/寝たきり順）。データが1件以上あるときのみ表示 |
| **入院中合併症** | 横棒（合併症別件数、上位8件）。サブタイトルに発生率%（分母=記載のある症例数）。データが1件以上あるときのみ表示 |

### 3.3 相関分析タブ（Analysis）

**状態管理**: analysisConfig state（Dashboard.tsx で保持、タブ切替で消えない）

#### モード切替（ScatterPanel / GroupComparePanel / StatsPanel）

**ScatterPanel（散布図）**
- **X軸/Y軸セレクタ**: 数値変数リスト（フィルタ適用後データで非null ≥3件の変数のみ）
- **治療群色分けトグル**: on で手術(rose)・保存(sky)・その他(slate)、off で単色（cyan）。凡例チップに群別件数を表示
- **回帰直線**: 全有効ペアの OLS を観測 X 範囲にクリップした点線で重畳
- **表示間引き**: 有効ペアが3,000点を超える場合は等間隔ストライドで最大3,000点のみ描画（統計量は常に全数で計算、間引き注記を表示）
- **クアドラントゲート**: X≧/Y≧ の数値入力（初期値は空=ゲートなし）。「中央値にセット」「クリア」ボタン。両方設定時、amber 点線のゲート線と4象限（左上/右上/左下/右下）の n・% 表を表示。境界値は「+」側に含める
- **ツールチップ**: 患者ID・X/Y値（単位付き）・治療群
- **実装**: `src/components/analysis/ScatterPanel.tsx`

**GroupComparePanel（群間比較）**
- **群分けセレクタ**: カテゴリ変数リスト（非null ≥3件の変数のみ）
- **比較する値セレクタ**: 数値変数リスト
- **ストリッププロット**:
  - X=カテゴリ位置、Y=数値。患者IDの FNV-1a ハッシュによる決定的ジッター（±0.28。Math.random はSSRとハイドレーションの不一致を生むため不使用）
  - 群ごとに中央値の水平線（白）を重畳
  - 群分けが「治療群」のときは全画面共通の治療群カラー、それ以外はカテゴリパレット
- **群別統計**: n・平均±SD・中央値[IQR] の表（StatsPanel 側に表示）
- **統計検定（ちょうど2群のとき）**:
  - Welch t 検定（Welch–Satterthwaite df）
  - Mann–Whitney U 検定（タイ補正・連続性補正）
  - n<8 の群があれば「参考値」注記。3群以上は検定せず CSV→EZR 等の利用を案内
- **実装**: `src/components/analysis/GroupComparePanel.tsx`

**StatsPanel（統計量パネル）**
- **散布図モード**: 有効ペア n・欠損除外数、Pearson r・95%CI（Fisher z 変換、n≥4）・両側 p・相関の強さのめやす（|r|<0.2 ほぼ相関なし 〜 ≥0.7 強い相関）、Spearman ρ・p（n<10 は参考値注記）、単回帰式 y=ax+b・R²・傾きの解釈文、治療群別 Pearson r（色分け on のとき）
- **群間比較モード**: 群別要約表＋2群検定（上記）
- **注記**: 「検定はすべて探索的解析（多重比較未補正）。確証解析は CSV を出力して EZR / SPSS 等で」をタブ下部に常時表示（RESEARCH.md 参照）

#### 軸候補の自動生成
`src/lib/variables.ts` の `NUMERIC_VARIABLES` / `CATEGORICAL_VARIABLES` から、現在のフィルタ適用後データで非null 値が3件以上ある変数のみセレクタに表示。研究用項目（research フラグ付き）も同じ仕組みで、データ入力が始まると自動的に出現する。

### 3.4 症例一覧タブ（Patients）

**テーブル機能**:
- **ソート**: 列見出しクリックで昇順/降順切替（null 値はソート方向にかかわらず常に末尾）
- **検索**: テキスト入力（ID・転帰・骨折椎体・術式の部分一致、大文字小文字無視）
- **椎体フィルタ**: 骨折椎体レベルの単一選択（「すべて」+ データに存在する椎体のみ列挙）

#### 基本列（PatientTable.tsx の BASE_COLUMNS）
| 列キー | ヘッダ | 内容 |
|-------|--------|------|
| id | ID | 患者ID |
| age | 年齢 / 性別 | ageNum / genderLabel |
| treatment | 転帰 | 転帰の原文をバッジ表示（手術=rose, 保存=sky, その他=slate。空欄は「未記入」） |
| procedure | 術式 | procedureLabel |
| admission | 入院日 | admissionDate（空欄は「外来」） |
| surgeryDate | 手術日 | formatDateJa（MM/DD はタイムスタンプの年で補完）or「—」 |
| discharge | 退院日 | formatDateJa or「—」 |
| los | 在院日数 | losDays +「日」or「—」 |
| postOp | 術後日数 | postOpDays +「日」or「—」 |
| fractures | 骨折椎体 | fractureLevels.join(', ') |
| of | OF分類 | ofClassification |
| destination | 退院先 | dischargeDestination |
| mri | MRI | http で始まる URL のみリンク化（複数可・新規タブ。ソート不可） |

**研究用列の自動追加**:
変数レジストリの research フラグ付き項目（BMD・NRS・Barthel・歩行能力・Alb・25(OH)D・合併症・隣接骨折・再入院・死亡・装具・退院時OP薬）は、非null 値が **1件以上** あれば右端に列として自動追加（数値は単位付き表示）。

#### CSV 出力（CsvExportButton）
- **対象**: 検索・フィルタ・ソート適用後の表示中症例
- **形式**: UTF-8 BOM 付き（Excel 対応）+ CRLF、日本語ヘッダ
- **列構成**（`src/lib/csv.ts`）:
  - 原文19列: ID・タイムスタンプ・性別・受傷日・受傷機転・受傷前ADL・神経症状・MRI・既往歴・骨粗鬆症治療歴・疼痛・入院日・骨折椎体・転帰・手術日・退院日・合併症・備考・備考2
  - 治療群（手術/保存/その他）
  - 派生列: 変数レジストリ全項目（数値・カテゴリとも。単位はヘッダに付記、欠損は空欄）
- **出力ファイル名**: `ovf_export_YYYYMMDD.csv`

**実装**: `src/components/patients/PatientTable.tsx`・`src/components/patients/CsvExportButton.tsx`・`src/lib/csv.ts`

---

## 4. データ仕様

### 4.1 Google Sheets 列マッピング（0〜42 全列）

| インデックス | フィールド名 | 型 | GAS キー | 説明 |
|-----------|-----------|-----|---------|------|
| 0 | Timestamp | Date | timestamp | フォーム自動タイムスタンプ |
| 1 | ID | String | id | 連結可能匿名化ID |
| 2 | Gender | String | gender | 男性/女性/Male/Female |
| 3 | Age | Number | age | 年齢（歳） |
| 4 | Injury Date | String | injuryDate | 受傷日（YYYY/MM/DD or MM/DD） |
| 5 | Fall History | String | fallHistory | 転倒あり/なし/Yes/No |
| 6 | Pre-Injury ADL | String | preInjuryADL | 受傷前ADL（自由記述） |
| 7 | Neuro Symptoms | String | neuroSymptoms | 神経症状（自由記述） |
| 8 | OF Classification | String | ofClassification | OF分類（Type 1〜4） |
| 9 | MRI Image | String | mriImage | MRI リンク or 所見記述 |
| 10 | Medical History | String | medicalHistory | 既往歴（自由記述） |
| 11 | Osteoporosis History | String | osteoporosisHistory | 骨粗鬆症治療歴（薬剤名 or なし） |
| 12 | Remarks | String | remarks | その他記述 |
| 13 | Current Pain | String | currentPain | 現在の疼痛（Severe/Moderate/Mild など） |
| 14 | Admission Date | String | admissionDate | 入院日（YYYY/MM/DD or MM/DD） |
| 15 | New Fractures | String | newFractures | 骨折椎体（T1, T12, L1 等、カンマ or スペース区切り） |
| 16 | Time to Admission | String | timeToAdmission | 受傷→入院（"6 days" or "5" など、計算済み） |
| 17 | Outcome | String | outcome | 転帰（手術/Surgery/保存/Conservative/経過観察/Observation など） |
| 18 | Procedure | String | procedure | 術式（BKP / BKP+PF など） |
| 19 | Surgery Date | String | surgeryDate | 手術日（YYYY/MM/DD or MM/DD） |
| 20 | Discharge Date | String | dischargeDate | 退院日（YYYY/MM/DD or MM/DD） |
| 21 | Hospitalization Period | String \| Number | hospitalizationPeriod | 在院日数（数値 / 日付文字列 / "14 days" 形式が混在。負値は日付から再計算） |
| 22 | Height | Number | height | 身長（cm） |
| 23 | Weight | Number | weight | 体重（kg） |
| 24 | BMI | Number | bmi | BMI（計算済み or 手入力） |
| 25 | Discharge Destination | String | dischargeDestination | 退院先（自宅/施設/リハビリ転院） |
| 26 | Follow-up Status | String | followUpStatus | フォローアップ状況（Discharged/In Hospital など） |
| **以下、任意列（27=予約済み備考2、28〜42=研究用。シートに列が無くても動作）** |
| 27 | Remarks 2 | String | remarks2 | 追加備考 |
| 28 | BMD YAM% | Number | bmdYamPercent | 骨密度 YAM%（例 62） |
| 29 | BMD T-score | Number | bmdTScore | 骨密度 T スコア（例 -3.1） |
| 30 | NRS on Admission | Number | nrsOnAdmission | 入院時疼痛 NRS（0〜10） |
| 31 | NRS at Discharge | Number | nrsAtDischarge | 退院時疼痛 NRS（0〜10） |
| 32 | Barthel on Admission | Number | barthelOnAdmission | 入院時 Barthel Index（0〜100） |
| 33 | Barthel at Discharge | Number | barthelAtDischarge | 退院時 Barthel Index（0〜100） |
| 34 | Ambulation at Discharge | String | ambulationAtDischarge | 退院時歩行能力（独歩/杖/歩行器/車椅子/寝たきり） |
| 35 | Serum Albumin | Number | albumin | 血清アルブミン（g/dL） |
| 36 | 25(OH)Vitamin D | Number | vitD25OH | 25(OH)ビタミンD（ng/mL） |
| 37 | Complications | String | complications | 入院中合併症（カンマ or 中点区切り、なし で未発生） |
| 38 | Adjacent Fracture | String | adjacentFracture | 新規隣接椎体骨折（あり/なし） |
| 39 | Readmission 90d | String | readmission90d | 90日以内再入院（あり/なし） |
| 40 | Death Status | String | deathStatus | 死亡（なし/入院中/1年以内） |
| 41 | Brace Type | String | braceType | 装具（硬性/軟性/なし） |
| 42 | OP Med at Discharge | String | opMedAtDischarge | 退院時骨粗鬆症治療薬（テリパラチド/デノスマブ/BP等） |

**注**:
- 列 28〜42 は入力の有無で自動。GAS マッピングは設定済み（google_apps_script.js）
- 列の順番が重要（ヘッダ名ではなく index で読むため）。途中挿入は禁止、追加は右端のみ
- 空欄 = 欠損として null に変換、集計から自動除外

### 4.2 PatientRecord 型と DerivedPatient 派生フィールド

#### PatientRecord（src/types/patient.ts）
GAS JSON から直接マッピングされる。コア 26 フィールド（string/number/undefined）＋ 研究用オプション 17 フィールド（?付き）。

#### DerivedPatient（src/lib/derive.ts）
PatientRecord を derivePatient() で処理した派生値。

| 派生フィールド | 型 | 計算式・説明 |
|---------------|-----|-----------|
| id | String | raw.id のそのまま |
| gender | "male" \| "female" \| null | classifyGender()：male/女性/M/F 等の正規化 |
| genderLabel | String \| null | gender を「男性」「女性」に翻訳 |
| ageNum | Number \| null | age > 0 なら age、else null |
| ageGroup | AgeGroup \| null | ageNum から自動分類（<60 / 60-69 / 70-79 / 80-89 / 90+） |
| baseYear | Number | timestamp から抽出（年跨ぎ日付パース用） |
| yearLabel | String \| null | timestamp の年（"2023" 等、フィルタ用） |
| monthKey | String \| null | "YYYY-MM"（月別推移グラフ用） |
| treatmentGroup | "surgery" \| "conservative" \| "other" | classifyTreatment(outcome)：転帰から自動判定 |
| procedureLabel | String \| null | procedure を trim・null 化 |
| fallCategory | FallCategory | normalizeFallHistory()：転倒の 3 値分類 |
| fractureLevels | String[] | newFractures をパース（["L1", "L2"] など） |
| fractureLevelIndex | Number \| null | 先頭の椎体を 1〜17 の指数に（T1=1, L5=17） |
| ofClassification | String \| null | OF分類をそのまま |
| losDays | Number \| null | calculateHospitalizationDays(admissionDate, hospitalizationPeriod, timestamp, dischargeDate)：在院日数 |
| preOpDays | Number \| null | 入院→手術の日数（calculateHospitalizationDays(admissionDate, surgeryDate, ...) ） |
| postOpDays | Number \| null | 術後在院日数（losDays − 術前日数。負になる場合は手術日→退院日から再計算）。手術群のみ |
| timeToSurgeryDays | Number \| null | 受傷→手術の日数 |
| timeToAdmissionDays | Number \| null | 受傷→入院の日数（timeToAdmission フィールド or 日付差） |
| heightNum | Number \| null | height を toNum()（数値抽出） |
| weightNum | Number \| null | weight を toNum() |
| bmiNum | Number \| null | bmi が null なら (weightNum/(heightNum/100)²) で計算、小数点1位四捨五入 |
| onOsteoporosisTx | Boolean \| null | osteoporosisHistory が「なし/無」でない → true（治療歴あり） |
| hasNeuroSymptoms | Boolean \| null | neuroSymptoms が「なし/無」でない → true（神経症状あり） |
| dischargeDestination | String \| null | dischargeDestination をそのまま |
| bmdYamPercent | Number \| null | toNum(bmdYamPercent)（研究用） |
| bmdTScore | Number \| null | toNum(bmdTScore) |
| nrsOnAdmission | Number \| null | toNum(nrsOnAdmission) |
| nrsAtDischarge | Number \| null | toNum(nrsAtDischarge) |
| nrsImprovement | Number \| null | 入院時NRS − 退院時NRS（正値=改善、負値=増悪） |
| barthelOnAdmission | Number \| null | toNum(barthelOnAdmission) |
| barthelAtDischarge | Number \| null | toNum(barthelAtDischarge) |
| ambulationAtDischarge | String \| null | そのまま |
| albumin | Number \| null | toNum(albumin) |
| vitD25OH | Number \| null | toNum(vitD25OH) |
| complicationsList | String[] | complications をパース（複数あれば配列） |
| hasComplication | Boolean \| null | 合併症欄が空欄なら null（未調査）、「なし」は false、項目があれば true |
| adjacentFracture | Boolean \| null | toBool(adjacentFracture)：あり/なし → true/false |
| readmission90d | Boolean \| null | toBool(readmission90d) |
| deathStatus | String \| null | そのまま（"なし"/"入院中"/"1年以内"） |
| braceType | String \| null | そのまま |
| opMedAtDischarge | String \| null | そのまま |

**規格化関数**:
- `classifyTreatment(outcome)`: 「手術/Surgery」→ "surgery"、「保存/Conservative/観察/Observation」→ "conservative"、その他 → "other"
- `toNum(v)`: 文字列から最初の数値を抽出（"14 days" → 14、"-3.1" → −3.1）。数値が無ければ null
- `toBool(v)`: 「あり/有/yes」→ true、「なし/無/no」→ false、その他 → null
- `classifyGender(v)`: 「female/女」→ "female"、「male/男」→ "male"、その他 → null

### 4.3 治療群判定（classifyTreatment）

outcome フィールドの文字列から自動判定。**優先順位あり**（手術 > 保存）:

```
if outcome.includes("手術") or outcome.includes("Surgery") 
    → "surgery"
else if outcome.includes("保存") or outcome.includes("Conservative") 
    or outcome.includes("経過観察") or outcome.includes("Observation")
    → "conservative"
else
    → "other"
```

### 4.4 日付・在院日数の計算規則（src/lib/dates.ts）

#### 日付フォーマット対応
- **入力形式**: 「MM/DD」「MM-DD」「YYYY/MM/DD」「YYYY-MM-DD」
- **年補完**: MM/DD 形式の年は、タイムスタンプから自動抽出（baseYear）
- **Chrome 2001年デフォルト**: 一部ブラウザで "MM-DD" が 2001年に解釈される問題に対応

#### 年跨ぎ補正
入院日 > 退院日（例：12月入院 → 1月退院）の場合、入院日の年を -1 補正:
```
if startDate > endDate:
    startDate.setFullYear(baseYear - 1)
```

#### 在院日数計算（calculateHospitalizationDays）
入力 hospitalizationPeriod（数値・日付・"14 days" など混在）に対応:

1. **数値（|n| < 1000）**: そのまま日数として返却
   - 負値の場合：admission + discharge 日付から再計算、補正不能なら null
2. **日付形式**: parseFlexibleDate で解析 → 日数を計算（年跨ぎ補正含む）
3. **"X days" 形式**: 正規表現で数字抽出
4. **失敗時**: null（display: 「—」）

---

## 5. 統計仕様（src/lib/stats.ts）

### 記述統計
- **mean(xs)**: 算術平均
- **sd(xs)**: 標本標準偏差（n−1）。n<2 は NaN
- **median(xs)**: 中央値（分位点 q=0.5）
- **quantile(xs, q)**: R type-7 線形補間（0≦q≦1）
- **iqr(xs)**: [Q1, Q3]（四分位数）

### 相関・検定

| 検定・統計量 | 実装 | 入力 | 出力 |
|-----------|------|------|-----|
| **Pearson r** | r = SS_xy / √(SS_xx × SS_yy)、p は t 分布（df=n−2、両側） | ペア配列 | r・95%CI（Fisher z、n≥4）・p値 |
| **Spearman ρ** | 中央ランク（タイは平均順位）→ ランクに Pearson、p は t 近似 | ペア配列 | ρ・p値（n<10 は参考値） |
| **単回帰 OLS** | a = SS_xy/SS_xx、b = mean(y) − a·mean(x) | ペア配列 | 傾き・切片・R² |
| **Welch t 検定** | t = (mean1−mean2)/SE、df は Welch–Satterthwaite | 2群の数値配列 | t・df・p値（両側） |
| **Mann–Whitney U** | U = min(U1, U2)、正規近似（タイ補正分散＋連続性補正0.5） | 2群の数値配列 | U・z・p値（n<8 は参考値） |
| **カイ二乗検定** | Pearson χ²（r×c）、期待度数<5 で警告 | 分割表 | χ²・df・p値（実装済み・現行UIでは未使用） |

### p 値計算の数値解析
- **logGamma(x)**: Lanczos 近似（g=7, 9係数）
- **incomplete beta（連分数法）**: Modified Lentz 法（MAXIT=300, EPS=3e−14）
- **incomplete gamma**: Numerical Recipes 定式化

### 縮退入力への対応
- 検定・相関は縮退入力（n 不足・分散 0・全値タイ）で null を返す（sd のみ n<2 で NaN）
- UI 側は null を「—」「データ不足」「計算不可」と表示し、NaN を画面に出さない

---

## 6. 非機能・運用

### 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `NEXT_PUBLIC_GAS_API_URL` | https://script.google.com/macros/s/AKfycbw0... | Google Apps Script Web app エンドポイント。未設定・失敗時はモック |
| `AUTH_USER` | （必須） | ログイン ID。未設定だと照合が常に失敗しログイン不可 |
| `AUTH_PASS` | （必須） | ログインパスワード |
| `NODE_ENV` | development | development/production（secure cookie はここで判定） |

### ISR・キャッシング
- **revalidate**: 3600秒（1時間）。page.tsx と dataService.ts で統一
- **Cookie**: session（httpOnly、maxAge 604,800秒=7日）

### カラー規約

| 用途 | 16進 | Tailwind | 使用箇所 |
|------|------|---------|--------|
| 手術（Surgery） | #fb7185 | rose-400 | チャート・badge・フィルタ |
| 保存（Conservative） | #38bdf8 | sky-400 | チャート・badge・フィルタ |
| その他（Other） | #94a3b8 | slate-400 | チャート・badge |
| アクセント（単系列） | #22d3ee | cyan-400 | ボタン・accent チャート |
| 男性 | #60a5fa | blue-400 | 性別チャート |
| 女性 | #f472b6 | pink-400 | 性別チャート |

**重要**: colors.ts で定義した hex 値（surgery / conservative / accent）は globals.css の `@theme` にも二重管理。Recharts は SVG fill に CSS 変数を使えないため、変更時は両ファイルを更新する。

### コマンド

```bash
npm run dev        # 開発サーバー (localhost:3000)
npm run build      # 本番ビルド（TS チェック含む）
npm run start      # 本番サーバー起動
npx eslint src     # Lint チェック
```

**オフライン動作確認**:
```bash
NEXT_PUBLIC_GAS_API_URL=http://127.0.0.1:9 npm run dev
```
（失敗時モック 10 例にフォールバック）

### Google Apps Script デプロイ手順

1. Google Apps Script エディタを開く（Google Sheets → 「拡張機能」→ 「Apps Script」）
2. `google_apps_script.js` の内容をすべてコピー → 貼り付け
3. 「デプロイ」→ 「新しいデプロイ」→ 「種類を選択」で「ウェブアプリ」
4. 「実行」: 自分のアカウント、「アクセス」: 任意のユーザー
5. 生成された URL を `.env.local` の `NEXT_PUBLIC_GAS_API_URL` に設定

### 新項目追加手順

以下 6 ファイルを 1 箇所ずつ修正:

1. **Google Sheets**: 右端（列28以降）に列追加
2. **google_apps_script.js**: `record.newFieldName = row[N];` を追加
3. **src/types/patient.ts**: PatientRecord に型定義（オプショナル推奨）
4. **src/services/dataService.ts**: optionalValue() で後処理
5. **src/lib/derive.ts**: derivePatient() に派生計算ロジック（必要なら）
6. **src/lib/variables.ts**: NUMERIC_VARIABLES or CATEGORICAL_VARIABLES にエントリ追加

画面・CSV に自動反映。

### 制約・既知の留意点

- **検定は探索的**: 多重比較補正なし。p<0.05 の発見は仮説生成であり、論文の結論ではない
- **列順序依存**: GAS マッピングはインデックス依存。途中に列を挿入するとズレる → 追加は右端のみ
- **匿名化維持**: ID は院内連結可能匿名化 ID のみ。氏名・カルテ番号を入力しない
- **倫理手続き**: 後ろ向き研究として公表する場合は倫理委員会承認を要件
- **年跨ぎの特殊処理**: dates.ts のロジックは実データの癖を補正している。軽率な「修正」は禁止

---

## 7. ファイル構成（主要）

```
src/
├── app/
│   ├── page.tsx                    # SSR エントリ（fetchPatients → Dashboard）
│   ├── layout.tsx                  # html lang="ja", metadata
│   ├── login/page.tsx              # ログイン画面
│   └── actions/auth.ts             # Server Actions（login, logout）
├── middleware.ts                   # route 保護
├── components/
│   ├── Dashboard.tsx               # シェル：派生・フィルタ・タブ管理
│   ├── ui/
│   │   ├── TabBar.tsx              # タブ UI
│   │   ├── Select.tsx              # セレクト UI
│   │   ├── StatCard.tsx            # KPI カード
│   │   ├── ChartCard.tsx           # チャート容器
│   │   ├── Section.tsx             # セクション見出し
│   │   └── chartTheme.tsx          # Recharts ダークテーマ
│   ├── tabs/
│   │   ├── OverviewTab.tsx         # 概況タブ
│   │   ├── AnalysisTab.tsx         # 相関分析タブ
│   │   └── PatientsTab.tsx         # 症例一覧タブ
│   ├── overview/
│   │   ├── KpiRow.tsx              # KPI 行
│   │   ├── EpidemiologySection.tsx # 疫学セクション
│   │   ├── LosSection.tsx          # 在院日数セクション
│   │   └── OutcomeSection.tsx      # 転帰セクション
│   ├── analysis/
│   │   ├── ScatterPanel.tsx        # 散布図モード
│   │   ├── GroupComparePanel.tsx   # 群間比較モード
│   │   └── StatsPanel.tsx          # 統計パネル
│   └── patients/
│       ├── PatientTable.tsx        # テーブル UI＆ソート・検索
│       └── CsvExportButton.tsx     # CSV DL ボタン
├── services/
│   └── dataService.ts              # GAS fetch、モック、型補正
├── types/
│   └── patient.ts                  # PatientRecord 型定義
└── lib/
    ├── derive.ts                   # derivePatient()、治療群判定
    ├── dates.ts                    # 日付パース、年跨ぎ補正
    ├── variables.ts                # 変数レジストリ（軸候補生成）
    ├── stats.ts                    # 統計エンジン（相関・検定）
    ├── colors.ts                   # 色定数（colors.ts ← globals.css @theme）
    ├── csv.ts                      # CSV 生成・DL
    └── aggregate.ts                # countBy 等の集計ヘルパー
```

---

## 補記

- **開発ドキュメント**: CLAUDE.md（規約・GAS 反映手順）
- **研究ドキュメント**: RESEARCH.md（統計注記・運用ワークフロー・倫理指針）
