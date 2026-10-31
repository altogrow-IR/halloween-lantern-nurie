import { useEffect, useState } from "react";
import "./App.css";

const SAVE_KEY = "halloween-lantern-nurie-save-v1";

/* ---------- データ型 ---------- */

type DesignId = "normal" | "cat" | "smile";

/** リージョンID → 塗った色（#rrggbb）。キーが無い＝未塗り */
type ColorMap = Record<string, string>;

interface Work {
  id: string;
  design: DesignId;
  colors: ColorMap;
  savedAt: number;
}

interface SaveData {
  works: Work[];
  /** 今までに「ほぞん」した回数の合計 */
  totalSaved: number;
  currentDesign: DesignId;
  /** デザインごとの制作途中の色 */
  drafts: Record<DesignId, ColorMap>;
}

const DESIGNS: { id: DesignId; label: string; emoji: string }[] = [
  { id: "normal", label: "ふつうの ランタン", emoji: "🎃" },
  { id: "cat", label: "ねこ ランタン", emoji: "🐱" },
  { id: "smile", label: "わらい ランタン", emoji: "😄" },
];

const DESIGN_LABEL: Record<DesignId, string> = {
  normal: "ふつうの ランタン",
  cat: "ねこ ランタン",
  smile: "わらい ランタン",
};

/* ---------- パレット ---------- */

interface PaletteColor {
  name: string;
  value: string;
}

const PALETTE: PaletteColor[] = [
  { name: "オレンジ", value: "#ff8c42" },
  { name: "あか", value: "#ef476f" },
  { name: "ピンク", value: "#ff9ec7" },
  { name: "きいろ", value: "#ffd93d" },
  { name: "みどり", value: "#6bcb77" },
  { name: "みずいろ", value: "#4ecdc4" },
  { name: "あお", value: "#4d96ff" },
  { name: "むらさき", value: "#9b5de5" },
  { name: "ちゃいろ", value: "#b08968" },
  { name: "くろ", value: "#3a3a3a" },
];

/** 選択中の色。ERASER は未塗りに戻す */
const ERASER = "eraser";

/** 未塗りのときの見た目 */
const UNPAINTED = "#ffffff";
const STROKE = "#5b3a1e";

/* ---------- 保存データの読み書き ---------- */

function emptyDrafts(): Record<DesignId, ColorMap> {
  return { normal: {}, cat: {}, smile: {} };
}

function loadSave(): SaveData {
  const fallback: SaveData = {
    works: [],
    totalSaved: 0,
    currentDesign: "normal",
    drafts: emptyDrafts(),
  };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      works: Array.isArray(parsed.works) ? parsed.works : [],
      totalSaved:
        typeof parsed.totalSaved === "number" ? parsed.totalSaved : 0,
      currentDesign:
        parsed.currentDesign === "cat" ||
        parsed.currentDesign === "smile" ||
        parsed.currentDesign === "normal"
          ? parsed.currentDesign
          : "normal",
      drafts: {
        normal: parsed.drafts?.normal ?? {},
        cat: parsed.drafts?.cat ?? {},
        smile: parsed.drafts?.smile ?? {},
      },
    };
  } catch {
    return fallback;
  }
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

/* ---------- ランタンの絵（SVG） ---------- */

interface LanternArtProps {
  design: DesignId;
  colors: ColorMap;
  onTapRegion?: (regionId: string) => void;
}

function LanternArt({ design, colors, onTapRegion }: LanternArtProps) {
  const fill = (id: string) => colors[id] ?? UNPAINTED;
  const regionProps = (id: string) => ({
    fill: fill(id),
    stroke: STROKE,
    strokeWidth: 4,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    onClick: onTapRegion ? () => onTapRegion(id) : undefined,
    style: onTapRegion
      ? { cursor: "pointer" }
      : { pointerEvents: "none" as const },
  });

  return (
    <svg
      viewBox="0 0 400 420"
      className="lantern-svg"
      role="img"
      aria-label="かぼちゃランタンの ぬりえ"
    >
      {/* そら（背景） */}
      <rect x={0} y={0} width={400} height={420} {...regionProps("sky")} />
      {/* おつきさま */}
      <circle cx={322} cy={68} r={38} {...regionProps("moon")} />
      {/* おほしさま */}
      <g {...regionProps("stars")}>
        <polygon points="70,44 76,60 93,60 79,70 84,87 70,77 56,87 61,70 47,60 64,60" />
        <polygon points="140,24 144,35 156,35 146,42 150,54 140,46 130,54 134,42 124,35 136,35" />
        <polygon points="36,140 40,150 50,150 42,156 45,167 36,160 27,167 30,156 22,150 32,150" />
      </g>
      {/* じめん */}
      <ellipse cx={200} cy={398} rx={196} ry={26} {...regionProps("ground")} />

      {/* ねこ耳（ねこランタンのときだけ、本体のうしろ） */}
      {design === "cat" && (
        <>
          <polygon points="122,182 92,102 176,138" {...regionProps("earLeft")} />
          <polygon points="278,182 308,102 224,138" {...regionProps("earRight")} />
        </>
      )}

      {/* かぼちゃ本体（5つのパーツ） */}
      <ellipse cx={106} cy={258} rx={44} ry={86} {...regionProps("bodyFarLeft")} />
      <ellipse cx={294} cy={258} rx={44} ry={86} {...regionProps("bodyFarRight")} />
      <ellipse cx={140} cy={258} rx={58} ry={94} {...regionProps("bodyLeft")} />
      <ellipse cx={260} cy={258} rx={58} ry={94} {...regionProps("bodyRight")} />
      <ellipse cx={200} cy={258} rx={72} ry={100} {...regionProps("bodyCenter")} />

      {/* へた */}
      <path
        d="M186,172 C180,146 188,124 212,114 C226,108 240,114 238,128 C236,142 220,144 214,152 C208,160 210,168 208,176 Z"
        {...regionProps("stem")}
      />

      {/* ほっぺ */}
      <ellipse cx={114} cy={290} rx={17} ry={11} {...regionProps("cheekLeft")} />
      <ellipse cx={286} cy={290} rx={17} ry={11} {...regionProps("cheekRight")} />

      {/* かお：デザインごとに形が変わる */}
      {design === "normal" && (
        <>
          <polygon points="138,258 164,214 190,258" {...regionProps("eyeLeft")} />
          <polygon points="210,258 236,214 262,258" {...regionProps("eyeRight")} />
          <polygon points="187,292 200,262 213,292" {...regionProps("nose")} />
          <path
            d="M128,298 L152,320 L176,300 L200,322 L224,300 L248,320 L272,298 L265,334 C232,350 168,350 135,334 Z"
            {...regionProps("mouth")}
          />
        </>
      )}

      {design === "cat" && (
        <>
          <ellipse cx={163} cy={240} rx={17} ry={22} {...regionProps("eyeLeft")} />
          <ellipse cx={237} cy={240} rx={17} ry={22} {...regionProps("eyeRight")} />
          <polygon points="187,270 213,270 200,288" {...regionProps("nose")} />
          <path
            d="M200,288 C192,301 177,301 171,290 C176,307 194,307 200,297 C206,307 224,307 229,290 C223,301 208,301 200,288 Z"
            {...regionProps("mouth")}
          />
          {/* ひげ（ぬれない飾り） */}
          <g stroke={STROKE} strokeWidth={3} strokeLinecap="round">
            <line x1={96} y1={268} x2={140} y2={276} />
            <line x1={98} y1={288} x2={140} y2={284} />
            <line x1={304} y1={268} x2={260} y2={276} />
            <line x1={302} y1={288} x2={260} y2={284} />
          </g>
        </>
      )}

      {design === "smile" && (
        <>
          <circle cx={163} cy={238} r={17} {...regionProps("eyeLeft")} />
          <circle cx={237} cy={238} r={17} {...regionProps("eyeRight")} />
          <circle cx={200} cy={272} r={11} {...regionProps("nose")} />
          <path
            d="M136,290 C158,340 242,340 264,290 C242,318 158,318 136,290 Z"
            {...regionProps("mouth")}
          />
        </>
      )}
    </svg>
  );
}

/* ---------- アプリ本体 ---------- */

export default function App() {
  const [save, setSave] = useState<SaveData>(loadSave);
  const [selectedColor, setSelectedColor] = useState<string>(PALETTE[0].value);
  const [message, setMessage] = useState<string>("");

  const design = save.currentDesign;
  const colors = save.drafts[design];

  /* 変更のたびに自動保存（制作途中も消えない） */
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
      // 保存に失敗しても操作は続ける
    }
  }, [save]);

  const paintRegion = (regionId: string) => {
    setMessage("");
    setSave((prev) => {
      const next: ColorMap = { ...prev.drafts[prev.currentDesign] };
      if (selectedColor === ERASER) {
        delete next[regionId];
      } else {
        next[regionId] = selectedColor;
      }
      return {
        ...prev,
        drafts: { ...prev.drafts, [prev.currentDesign]: next },
      };
    });
  };

  const switchDesign = (next: DesignId) => {
    setMessage("");
    setSave((prev) => ({ ...prev, currentDesign: next }));
  };

  const clearCurrent = () => {
    setSave((prev) => ({
      ...prev,
      drafts: { ...prev.drafts, [prev.currentDesign]: {} },
    }));
    setMessage("ぜんぶ けしたよ。またはじめから ぬれるよ！");
  };

  const saveWork = () => {
    const work: Work = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      design,
      colors: { ...colors },
      savedAt: Date.now(),
    };
    setSave((prev) => ({
      ...prev,
      works: [work, ...prev.works],
      totalSaved: prev.totalSaved + 1,
    }));
    setMessage("ほぞんしたよ！ したの いちらんを みてね 🎃");
  };

  const openWork = (work: Work) => {
    setSave((prev) => ({
      ...prev,
      currentDesign: work.design,
      drafts: { ...prev.drafts, [work.design]: { ...work.colors } },
    }));
    setMessage("さくひんを ひらいたよ。つづきを ぬれるよ！");
  };

  const deleteWork = (id: string) => {
    setSave((prev) => ({
      ...prev,
      works: prev.works.filter((w) => w.id !== id),
    }));
    setMessage("さくひんを けしたよ。");
  };

  const selectedName =
    selectedColor === ERASER
      ? "けしゴム（しろに もどす）"
      : (PALETTE.find((c) => c.value === selectedColor)?.name ?? "");

  const paintedCount = Object.keys(colors).length;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎃 かぼちゃランタンぬりえ</h1>
        <div className="stats">
          <span>ほぞんした さくひん：{save.works.length}こ</span>
          <span>いま ぬった ところ：{paintedCount}こ</span>
        </div>
        <p className="howto">
          いろを えらんで、ランタンの ぬりたい ところを タップしてね。
          デザインは 3つから えらべるよ。
        </p>
      </header>

      <div className="design-selector">
        {DESIGNS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={
              "design-btn" + (design === d.id ? " design-btn-active" : "")
            }
            onClick={() => switchDesign(d.id)}
          >
            <span className="design-emoji">{d.emoji}</span>
            {d.label}
          </button>
        ))}
      </div>

      <div className="canvas-panel">
        <LanternArt design={design} colors={colors} onTapRegion={paintRegion} />
      </div>

      <div className="selected-color">
        <span>えらんだ いろ：</span>
        {selectedColor === ERASER ? (
          <span className="selected-swatch swatch-eraser">🧽</span>
        ) : (
          <span
            className="selected-swatch"
            style={{ background: selectedColor }}
          />
        )}
        <strong>{selectedName}</strong>
      </div>

      <div className="palette">
        {PALETTE.map((c) => (
          <button
            key={c.value}
            type="button"
            className={
              "palette-btn" + (selectedColor === c.value ? " palette-btn-active" : "")
            }
            style={{ background: c.value }}
            onClick={() => setSelectedColor(c.value)}
            aria-label={c.name}
            title={c.name}
          />
        ))}
        <button
          type="button"
          className={
            "palette-btn palette-eraser" +
            (selectedColor === ERASER ? " palette-btn-active" : "")
          }
          onClick={() => setSelectedColor(ERASER)}
          aria-label="けしゴム"
          title="けしゴム"
        >
          🧽
        </button>
      </div>
      <p className="palette-note">🧽 けしゴムは、ぬった ところを しろに もどすよ</p>

      <div className="action-row">
        <button type="button" className="save-btn" onClick={saveWork}>
          💾 ほぞんする
        </button>
      </div>

      {message && <p className="message">{message}</p>}

      <div className="gallery">
        <h2>さくひん いちらん</h2>
        {save.works.length === 0 ? (
          <p className="gallery-empty">
            まだ さくひんが ないよ。ぬれたら「ほぞんする」を おしてね。
          </p>
        ) : (
          <div className="gallery-grid">
            {save.works.map((w) => (
              <div key={w.id} className="work-card">
                <div className="work-preview">
                  <LanternArt design={w.design} colors={w.colors} />
                </div>
                <p className="work-meta">
                  {DESIGN_LABEL[w.design]}
                  <br />
                  {formatDateTime(w.savedAt)}
                </p>
                <div className="work-buttons">
                  <button
                    type="button"
                    className="work-open-btn"
                    onClick={() => openWork(w)}
                  >
                    ひらく
                  </button>
                  <button
                    type="button"
                    className="work-delete-btn"
                    onClick={() => deleteWork(w.id)}
                  >
                    けす
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="danger-zone">
        <button type="button" className="clear-btn" onClick={clearCurrent}>
          いまの デザインを ぜんぶ けす
        </button>
      </div>
    </div>
  );
}
