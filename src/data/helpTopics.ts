import type { Language } from "../types";

/**
 * 도움말(Help) 탭과 `<Abbr>` / `<HelpIcon>` 의 단일 데이터 소스.
 *
 * - labels: 탭에 노출되는 1차 제목. 원어 + 병기 번역 포맷(예: "RSI (상대강도지수)").
 * - aliases: 검색어 매칭용 대체 표기. 사용자가 부르는 다양한 이름을 모두 넣음.
 * - summary: 한 줄 요약. 툴팁과 카드에서 사용.
 * - why: "왜 필요한가" 상세 설명. 도움말 상세 뷰에서 사용.
 *
 * 카테고리(category)는 목록에서 뱃지로 표시되며 필터 키 역할도 한다.
 */
export type HelpTopicId =
  // 봇/자동매매
  | "TRADING_BOT"
  | "LIVE"
  | "PAPER"
  | "BOT"
  // 기술적 지표
  | "TECH_INDICATORS"
  | "RSI"
  | "MACD"
  | "MA"
  | "EMA"
  | "SMA"
  | "VWAP"
  | "BOLLINGER_BAND"
  // 전략/패턴
  | "GOLDEN_CROSS"
  | "DEAD_CROSS"
  | "OVERBOUGHT"
  | "OVERSOLD"
  | "VOLATILITY"
  | "BUY_AND_HOLD"
  // 백테스팅/성과
  | "BACKTEST"
  | "MDD"
  | "TOL"
  | "TOTAL_RETURN"
  | "WIN_RATE"
  | "RETURN_PCT"
  | "EQUITY"
  | "CASH_RATIO"
  // 시장
  | "ETF"
  // 데이터/포맷
  | "CSV"
  | "OHLCV"
  | "UPLOADED"
  | "SAMPLE"
  | "EMPTY";

export type HelpCategory =
  | "bot"
  | "indicator"
  | "strategy"
  | "backtest"
  | "market"
  | "data";

export interface HelpTopic {
  id: HelpTopicId;
  category: HelpCategory;
  labels: { ko: string; en: string };
  /** 검색용 대체 표기들 (소문자/공백 민감 X. scoreTopic 에서 토큰화됨) */
  aliases: { ko: string[]; en: string[] };
  summary: { ko: string; en: string };
  why: { ko: string; en: string };
}

export const helpTopics: HelpTopic[] = [
  // ─────────── 봇/자동매매 ───────────
  {
    id: "TRADING_BOT",
    category: "bot",
    labels: {
      ko: "자동매매 봇 (Trading Bot)",
      en: "Trading Bot (자동매매 봇)",
    },
    aliases: {
      ko: ["자동매매", "자동매매봇", "봇", "트레이딩봇", "트레이딩 봇"],
      en: ["trading bot", "algo bot", "algorithmic trading", "auto trader"],
    },
    summary: {
      ko: "정해진 전략대로 자동으로 주문을 내는 프로그램.",
      en: "A program that places orders automatically based on a predefined strategy.",
    },
    why: {
      ko: "사람은 24시간 시장을 감시할 수 없고 감정에 흔들리기 쉽다. 봇은 규칙을 코드로 고정해 일관되게 실행하며, 새벽/해외 세션까지 놓치지 않고 여러 종목을 동시에 처리한다. 단, 규칙이 잘못되면 손실도 자동으로 쌓이므로 항상 백테스팅과 모의투자(paper) 로 먼저 검증한 뒤 실거래(LIVE) 로 올려야 한다.",
      en: "Humans can't watch markets 24/7 and are prone to emotional trades. A bot encodes rules in code and executes them consistently across overnight and overseas sessions on many symbols at once. The catch: bad rules lose money just as automatically — always validate with backtests and paper trading before going LIVE.",
    },
  },
  {
    id: "LIVE",
    category: "bot",
    labels: { ko: "LIVE (실거래)", en: "LIVE (Real Trading)" },
    aliases: { ko: ["실거래", "라이브"], en: ["live", "real money", "live trading"] },
    summary: {
      ko: "실제 계좌로 주문이 나가는 실거래 모드.",
      en: "Real-money trading mode — orders go to the live brokerage account.",
    },
    why: {
      ko: "실거래는 진짜 돈이 오간다. 백테스트 + 모의투자로 전략이 충분히 검증된 뒤에만 올려야 한다. LIVE 뱃지는 이 봇이 실계좌에 주문을 내고 있다는 최종 경고.",
      en: "Live mode moves real money. Only enable it after the strategy has been validated in backtests and paper trading. The LIVE badge is the final warning that this bot is sending orders to a live brokerage account.",
    },
  },
  {
    id: "PAPER",
    category: "bot",
    labels: { ko: "paper (모의투자)", en: "Paper Trading (모의투자)" },
    aliases: {
      ko: ["모의투자", "페이퍼", "페이퍼 트레이딩"],
      en: ["paper", "paper trading", "simulated trading"],
    },
    summary: {
      ko: "가상 계좌에서 실제 주문 없이 전략을 돌리는 모드.",
      en: "Runs the strategy on a simulated account — no real orders.",
    },
    why: {
      ko: "백테스트는 과거 데이터 시뮬레이션이고 실거래는 진짜 돈이다. 그 사이 가교가 모의투자(paper). 슬리피지, 체결 지연, 실시간 데이터 지연 같은 실제 이슈는 paper 모드에서만 드러난다.",
      en: "Backtesting is historical simulation, live is real money. Paper is the bridge — only paper trading reveals real-time issues like slippage, execution delays, and data lag.",
    },
  },
  {
    id: "BOT",
    category: "bot",
    labels: { ko: "BOT (봇 연결 뱃지)", en: "BOT (Bot-linked badge)" },
    aliases: {
      ko: ["봇 뱃지", "봇 연결", "봇 감지"],
      en: ["bot badge", "bot-linked", "detected from bot"],
    },
    summary: {
      ko: "이 티커가 등록된 자동매매 봇의 코드에서 감지되어 자동 등록되었음.",
      en: "This ticker was detected in a registered bot's Python code and auto-registered.",
    },
    why: {
      ko: "검증 데이터 탭에서 이 뱃지가 붙은 티커는 수동으로 추가한 게 아니라 봇 코드(SYMBOLS = [...]) 에서 파싱된 것. 봇 코드만 바꿔도 검증 데이터 목록이 자동 갱신되어 수동 관리 부담이 줄어든다.",
      en: "In the Validation Data tab, a ticker with this badge was not added by hand but parsed from a bot's code (SYMBOLS = [...]). Editing the bot code updates the validation list automatically — less manual bookkeeping.",
    },
  },

  // ─────────── 기술적 지표 ───────────
  {
    id: "TECH_INDICATORS",
    category: "indicator",
    labels: { ko: "기술적 지표 (Technical Indicators)", en: "Technical Indicators (기술적 지표)" },
    aliases: {
      ko: ["기술적지표", "기술지표", "보조지표"],
      en: ["technical indicators", "indicators", "technical analysis"],
    },
    summary: {
      ko: "가격·거래량 데이터를 가공해 추세·모멘텀·과열을 수치화한 도구들.",
      en: "Tools that turn price/volume data into quantified trend, momentum, and overheating signals.",
    },
    why: {
      ko: "봇 전략은 \"언제 사고 언제 팔까\" 를 객관적인 숫자 조건으로 표현해야 코드로 구현된다. \"RSI가 70을 넘으면 과매수\", \"SMA 20이 SMA 50을 위로 돌파하면 매수\" 처럼 지표가 그 조건의 기준이 된다. 하나만 쓰면 거짓 신호가 많아 보통 여러 지표를 조합한다.",
      en: "A bot strategy must express \"when to buy/sell\" as objective numeric rules. Indicators provide those rules — e.g. \"RSI > 70 means overbought\", \"buy when SMA 20 crosses above SMA 50\". Single indicators give false signals often, so strategies usually combine several.",
    },
  },
  {
    id: "RSI",
    category: "indicator",
    labels: { ko: "RSI (상대강도지수)", en: "RSI (Relative Strength Index)" },
    aliases: {
      ko: ["rsi", "상대강도지수", "상대강도"],
      en: ["rsi", "relative strength index"],
    },
    summary: {
      ko: "0~100 모멘텀 오실레이터. >70 과매수, <30 과매도.",
      en: "A 0–100 momentum oscillator. >70 overbought, <30 oversold.",
    },
    why: {
      ko: "가격만 봐서는 \"얼마나 빨리 올랐는가\" 를 파악하기 어렵다. RSI는 일정 기간 상승·하락 폭을 비율로 계산해 과열 정도를 하나의 숫자로 압축. 박스권/횡보장에서 평균회귀 진입 타이밍을 찾는 데 강하지만, 강한 추세장에서는 과매수가 오래 유지되어 조기 매도 신호를 주기 쉬워 다른 지표와 조합해 쓴다.",
      en: "Price alone doesn't tell you how fast it rose. RSI compresses recent gain/loss magnitudes into one number representing overheating. Strong in ranging markets for mean-reversion entries, but in strong trends it can stay overbought for long periods and trigger premature sells — usually combined with other indicators.",
    },
  },
  {
    id: "MACD",
    category: "indicator",
    labels: { ko: "MACD (이동평균 수렴·확산)", en: "MACD (Moving Average Convergence Divergence)" },
    aliases: {
      ko: ["macd", "맥디", "맥디 지표"],
      en: ["macd", "moving average convergence divergence"],
    },
    summary: {
      ko: "빠른 EMA − 느린 EMA. 0선 돌파와 시그널선 교차로 추세 전환을 포착.",
      en: "Fast EMA minus slow EMA. Zero-line crossovers and signal-line crossovers flag trend changes.",
    },
    why: {
      ko: "단순 이동평균 교차보다 반응이 빠르고, 0선 위/아래로 추세 방향을 한눈에 본다. 시그널선(MACD의 9일 EMA)과의 교차는 자주 쓰이는 매매 트리거. 가격과 MACD가 반대로 움직이는 \"다이버전스\"는 추세 반전을 선행하는 힌트로 해석된다.",
      en: "Reacts faster than plain MA crossovers, with the zero line showing trend direction at a glance. Crossovers with the signal line (a 9-period EMA of MACD) are common trade triggers. When price and MACD move in opposite directions (\"divergence\"), it often flags an upcoming reversal.",
    },
  },
  {
    id: "MA",
    category: "indicator",
    labels: { ko: "MA (이동평균선)", en: "MA (Moving Average)" },
    aliases: {
      ko: ["ma", "이동평균", "이동평균선", "이평", "이평선"],
      en: ["ma", "moving average"],
    },
    summary: {
      ko: "최근 N기간 가격의 평균. 가격 노이즈를 깎아 추세를 부드럽게 보여줌.",
      en: "The average price over the last N periods. Smooths noise to reveal the trend.",
    },
    why: {
      ko: "원본 가격은 매 분 출렁여 방향을 판단하기 어렵다. MA는 단기 변동을 평균으로 뭉개고 흐름만 남긴다. SMA/EMA/WMA 등 여러 변형이 있고, \"현재가가 MA 위인가 아래인가\" 는 가장 기본적인 추세 필터다.",
      en: "Raw prices fluctuate every minute, making direction hard to judge. MAs average out short-term noise and leave the flow. Variants include SMA/EMA/WMA; the most basic trend filter is simply \"is price above or below the MA?\".",
    },
  },
  {
    id: "EMA",
    category: "indicator",
    labels: { ko: "EMA (지수이동평균)", en: "EMA (Exponential Moving Average)" },
    aliases: {
      ko: ["ema", "지수이동평균", "지수 이동평균"],
      en: ["ema", "exponential moving average", "exponential ma"],
    },
    summary: {
      ko: "최근 가격에 더 큰 가중치를 주는 이동평균. SMA보다 반응이 빠름.",
      en: "A moving average that weights recent prices more heavily. Reacts faster than SMA.",
    },
    why: {
      ko: "SMA는 N일 전 가격과 오늘 가격을 똑같이 취급해서 전환점에서 느리게 반응한다. EMA는 최근 값을 무겁게 반영해 추세 전환을 더 빨리 포착. MACD, 볼린저 밴드 상당수 지표가 EMA를 기반으로 구성된다.",
      en: "SMA treats today and N days ago equally, so it lags at turning points. EMA gives more weight to recent values, catching trend shifts faster. Many indicators (MACD, some Bollinger-style filters) are built on EMAs.",
    },
  },
  {
    id: "SMA",
    category: "indicator",
    labels: { ko: "SMA (단순이동평균)", en: "SMA (Simple Moving Average)" },
    aliases: {
      ko: ["sma", "단순이동평균", "단순 이동평균"],
      en: ["sma", "simple moving average"],
    },
    summary: {
      ko: "최근 N일 종가의 단순 산술 평균. 가장 기본적인 추세 지표.",
      en: "Plain arithmetic mean of the last N closes. The most basic trend indicator.",
    },
    why: {
      ko: "단순해서 계산과 해석이 쉽고, 오래 써온 만큼 많은 트레이더가 같은 선을 보고 있다(= 자기충족적 지지/저항선이 되는 경향). 50일·200일 SMA는 기관 투자자가 장기 추세 판단에 즐겨 쓰는 기준선.",
      en: "Simple to compute and interpret, and so widely used that many traders watch the same line (making it a self-fulfilling support/resistance). The 50- and 200-day SMAs are favorite long-term-trend gauges for institutions.",
    },
  },
  {
    id: "VWAP",
    category: "indicator",
    labels: { ko: "VWAP (거래량 가중 평균가격)", en: "VWAP (Volume Weighted Average Price)" },
    aliases: {
      ko: ["vwap", "거래량 가중 평균", "거래량가중평균"],
      en: ["vwap", "volume weighted average price"],
    },
    summary: {
      ko: "하루 동안 체결가를 거래량으로 가중한 평균가. 기관 체결 기준선.",
      en: "The day's average price weighted by volume. A key benchmark for institutional execution.",
    },
    why: {
      ko: "기관 투자자는 대량 주문을 VWAP 근처에 분할 체결해 시장 충격을 최소화한다. 가격이 VWAP 위에서 거래되면 매수세 우위, 아래면 매도세 우위로 해석. 데이 트레이딩의 핵심 레퍼런스 가격.",
      en: "Institutional traders execute large orders around VWAP to minimize market impact. Price above VWAP = buyer-dominant session, below = seller-dominant. A core reference price for day trading.",
    },
  },
  {
    id: "BOLLINGER_BAND",
    category: "indicator",
    labels: { ko: "볼린저 밴드 (Bollinger Band)", en: "Bollinger Bands (볼린저 밴드)" },
    aliases: {
      ko: ["볼린저", "볼린저밴드", "볼린저 밴드", "bb"],
      en: ["bollinger", "bollinger band", "bollinger bands", "bb"],
    },
    summary: {
      ko: "이동평균 ± 표준편차 × N 으로 만든 밴드. 변동성과 평균회귀를 동시에 보여줌.",
      en: "Bands at moving average ± N × standard deviation. Shows volatility and mean-reversion at the same time.",
    },
    why: {
      ko: "밴드 폭이 좁아지면 변동성 축소 → 큰 움직임이 임박했다는 신호(\"스퀴즈\"). 가격이 상단을 뚫으면 과열, 하단을 뚫으면 과매도로 해석. 일반적으로 20일 SMA + 2σ 조합으로 쓰인다.",
      en: "Narrow bands = shrinking volatility, often preceding a big move (\"squeeze\"). Price piercing the upper band = overheating, lower band = oversold. The classic recipe is 20-period SMA with 2σ bands.",
    },
  },

  // ─────────── 전략/패턴 ───────────
  {
    id: "GOLDEN_CROSS",
    category: "strategy",
    labels: { ko: "골든 크로스 (Golden Cross)", en: "Golden Cross (골든 크로스)" },
    aliases: {
      ko: ["골든크로스", "골든 크로스"],
      en: ["golden cross", "goldencross"],
    },
    summary: {
      ko: "단기 이동평균이 장기 이동평균을 위로 뚫는 순간. 상승 추세 전환 신호.",
      en: "The moment a short-term MA crosses above a long-term MA. A bullish trend-change signal.",
    },
    why: {
      ko: "장기 평균 위로 단기 평균이 올라왔다는 건 최근 모멘텀이 전체 추세를 이겨냈다는 뜻. 흔히 SMA 50이 SMA 200 위로 올라가는 걸 \"Golden Cross\" 라 부르며, 장기 박스/하락장 이후 나타날수록 신뢰도가 높다고 본다.",
      en: "Short-term momentum overpowering the long-term trend. The classic version is SMA 50 crossing above SMA 200 — considered more reliable when it follows a prolonged sideways or down phase.",
    },
  },
  {
    id: "DEAD_CROSS",
    category: "strategy",
    labels: { ko: "데드 크로스 (Dead Cross)", en: "Dead Cross (데드 크로스)" },
    aliases: {
      ko: ["데드크로스", "데드 크로스", "death cross"],
      en: ["dead cross", "death cross", "deadcross"],
    },
    summary: {
      ko: "단기 이동평균이 장기 이동평균을 아래로 뚫는 순간. 하락 추세 전환 신호.",
      en: "The moment a short-term MA crosses below a long-term MA. A bearish trend-change signal.",
    },
    why: {
      ko: "골든 크로스의 반대. 최근 모멘텀이 꺾여 장기 추세까지 끌어내렸다는 뜻. 장기 약세 시작 신호로 자주 인용되나 가짜 신호도 많아 거래량/다른 지표 동반 확인이 권장된다.",
      en: "The opposite of a Golden Cross: recent momentum has rolled over hard enough to drag the long-term trend with it. Often cited as the start of a bear phase, but false signals are common — confirm with volume and other indicators.",
    },
  },
  {
    id: "OVERBOUGHT",
    category: "strategy",
    labels: { ko: "과매수 (Overbought)", en: "Overbought (과매수)" },
    aliases: {
      ko: ["과매수", "매수과열"],
      en: ["overbought"],
    },
    summary: {
      ko: "짧은 기간에 지나치게 올라 단기 조정 가능성이 커진 상태.",
      en: "State where price has risen too fast, raising the odds of a short-term pullback.",
    },
    why: {
      ko: "RSI > 70, 볼린저 밴드 상단 터치, 스토캐스틱 > 80 등으로 판정. 핵심은 \"비싸졌다\" 가 아니라 \"빨리 올랐다\" 이다. 강한 추세에서는 과매수가 길게 유지되기도 해서 단독으로 매도 신호로 쓰면 좋은 상승분을 놓치기 쉽다.",
      en: "Flagged by RSI > 70, upper-Bollinger touches, Stochastic > 80, etc. The key is \"risen too fast\", not simply \"expensive\". In strong trends it can stay overbought for long stretches — using it alone as a sell trigger often cuts winners short.",
    },
  },
  {
    id: "OVERSOLD",
    category: "strategy",
    labels: { ko: "과매도 (Oversold)", en: "Oversold (과매도)" },
    aliases: {
      ko: ["과매도", "매도과열"],
      en: ["oversold"],
    },
    summary: {
      ko: "짧은 기간에 지나치게 떨어져 단기 반등 가능성이 커진 상태.",
      en: "State where price has dropped too fast, raising the odds of a short-term bounce.",
    },
    why: {
      ko: "RSI < 30 이 대표 기준. 패닉 매도 후 단기 반등을 노리는 평균회귀 전략의 진입 신호로 자주 쓰인다. 다만 구조적 폭락 구간에서는 과매도에서 더 떨어질 수도 있어 손절선을 함께 설정해야 한다.",
      en: "Classic trigger: RSI < 30. Commonly used as an entry for mean-reversion strategies after panic selling. Beware structural sell-offs — price can keep dropping past \"oversold\", so always pair with a stop-loss.",
    },
  },
  {
    id: "VOLATILITY",
    category: "strategy",
    labels: { ko: "변동성 (Volatility)", en: "Volatility (변동성)" },
    aliases: {
      ko: ["변동성", "변동", "vol"],
      en: ["volatility", "vol"],
    },
    summary: {
      ko: "가격이 얼마나 크게 출렁이는지를 수치화한 값 (표준편차, ATR 등).",
      en: "A number that quantifies how much price swings (standard deviation, ATR, etc.).",
    },
    why: {
      ko: "변동성이 크면 수익 기회도 크지만 손실 위험도 함께 커진다. 포지션 크기, 손절 폭, 옵션 가격 산정의 핵심 입력값. 저변동성 구간은 흔히 큰 움직임 직전의 \"조용함\" 으로 해석되기도 한다.",
      en: "Higher volatility = bigger potential profits but bigger losses too. Core input for position sizing, stop-loss width, and option pricing. Low-volatility stretches are often read as calm-before-a-storm.",
    },
  },
  {
    id: "BUY_AND_HOLD",
    category: "strategy",
    labels: { ko: "매수 후 보유 (Buy & Hold)", en: "Buy & Hold (매수 후 보유)" },
    aliases: {
      ko: ["매수후보유", "매수 후 보유", "바이앤홀드", "바이 앤 홀드"],
      en: ["buy and hold", "buy & hold", "buy-and-hold", "buyandhold"],
    },
    summary: {
      ko: "사서 장기간 그대로 보유하는 단순 전략. 백테스트의 기준선으로 자주 쓰임.",
      en: "A simple strategy: buy and keep holding for a long time. Frequently used as a backtest baseline.",
    },
    why: {
      ko: "어떤 전략이든 \"그냥 사서 묻어뒀을 때\" 보다 수익이 좋아야 실효가 있다. S&P 500 Buy & Hold 는 오랜 기간 이기기 어려운 벤치마크로 꼽힌다. 봇이 Buy & Hold 를 못 이기면 결국 수수료만 내는 셈.",
      en: "Any strategy only matters if it beats just buying and sitting. S&P 500 Buy & Hold is a notoriously hard benchmark to beat long-term. If a bot can't beat it, it's essentially paying fees for nothing.",
    },
  },

  // ─────────── 백테스팅/성과 ───────────
  {
    id: "BACKTEST",
    category: "backtest",
    labels: { ko: "백테스팅 (Backtesting)", en: "Backtesting (백테스팅)" },
    aliases: {
      ko: ["백테스트", "백테스팅"],
      en: ["backtest", "backtesting"],
    },
    summary: {
      ko: "과거 시세에 전략을 돌려 \"그때 썼더라면\" 수익을 시뮬레이션.",
      en: "Running a strategy on historical prices to see what it would have earned in the past.",
    },
    why: {
      ko: "실제 돈을 넣기 전에 전략이 어땠을지 검증하는 필수 단계. 수익률/MDD/승률 등의 지표를 비교해 전략을 개선. 과적합(과거에만 잘 맞춤)과 생존편향을 조심해야 하며, 백테스트 성적이 좋다고 미래 성적이 보장되지는 않는다.",
      en: "An essential step before risking real money — check how the strategy would have behaved. Compare return, MDD, win rate to refine the rules. Watch for overfitting (works only on past data) and survivorship bias — good backtests don't guarantee good future results.",
    },
  },
  {
    id: "MDD",
    category: "backtest",
    labels: { ko: "MDD (최대낙폭)", en: "MDD (Maximum Drawdown)" },
    aliases: {
      ko: ["mdd", "최대낙폭", "최대 낙폭"],
      en: ["mdd", "max drawdown", "maximum drawdown", "drawdown"],
    },
    summary: {
      ko: "기간 중 고점 대비 가장 크게 하락한 비율. 대표 리스크 지표.",
      en: "The largest peak-to-trough decline during the period. Headline risk metric.",
    },
    why: {
      ko: "총 수익률만 보면 전략이 좋아 보여도 중간에 -50% 를 찍었다면 실제로 들고 있을 수 있는 사람이 드물다. MDD는 \"최악의 순간 얼마나 떨어졌는가\" 를 보여주는 심리적 한계 지표. 샤프비율/칼마비율 같은 리스크 조정 지표의 기반.",
      en: "Total return can look great while hiding a −50% midway drawdown that nobody could actually sit through. MDD shows the worst trough — it's a psychological feasibility gauge and the basis of risk-adjusted metrics like Calmar ratio.",
    },
  },
  {
    id: "TOL",
    category: "backtest",
    labels: { ko: "Tol % (허용 오차)", en: "Tol % (Tolerance)" },
    aliases: {
      ko: ["tol", "허용오차", "허용 오차", "톨러런스"],
      en: ["tol", "tolerance"],
    },
    summary: {
      ko: "웹 시세와 로컬 검증 데이터의 종가 차이 허용 비율 (%).",
      en: "Allowed % difference between web-fetched prices and local validation data.",
    },
    why: {
      ko: "서버 시세와 로컬 데이터가 완전히 일치해야 한다고 요구하면 소수점 오차, 분할·배당 반영 차이만으로도 검증이 계속 실패한다. Tol %는 \"이 정도는 같은 값으로 보자\" 의 허용치. 너무 낮으면 거짓 실패, 너무 높으면 진짜 데이터 오류를 놓친다.",
      en: "Requiring exact equality between server prices and local data fails constantly due to rounding, split/dividend handling, etc. Tol % sets \"close enough\". Too low and you get false failures; too high and real data errors slip through.",
    },
  },
  {
    id: "TOTAL_RETURN",
    category: "backtest",
    labels: { ko: "총 수익률 (Total Return)", en: "Total Return (총 수익률)" },
    aliases: {
      ko: ["총수익률", "총 수익률"],
      en: ["total return", "cumulative return"],
    },
    summary: {
      ko: "기간 처음부터 끝까지의 누적 수익률(%). 최종 평가액 ÷ 초기 자본 − 1.",
      en: "Cumulative % return start-to-end: final equity / initial capital − 1.",
    },
    why: {
      ko: "기간 전체의 최종 성과를 한 줄로 요약. 다른 전략이나 벤치마크(예: S&P 500 Buy & Hold) 와 동일 기간으로 비교할 때 필수 지표.",
      en: "A one-number summary of end-to-end performance, essential for comparing strategies or benchmarks (e.g. S&P 500 Buy & Hold) over the same window.",
    },
  },
  {
    id: "WIN_RATE",
    category: "backtest",
    labels: { ko: "승률 (Win Rate)", en: "Win Rate (승률)" },
    aliases: {
      ko: ["승률"],
      en: ["win rate", "winrate"],
    },
    summary: {
      ko: "종료된 거래 중 수익 거래의 비율.",
      en: "Share of closed trades that ended in profit.",
    },
    why: {
      ko: "단순 수익률은 \"크게 한두 번 이기고 작게 여러 번 진\" 결과일 수도 있다. 승률은 신호 자체의 적중도. 다만 낮은 승률에 큰 손익비(win/loss ratio) 로도 수익을 내는 전략이 있어 단독으로만 평가하면 안 된다.",
      en: "Raw returns can hide a \"few big wins + many small losses\" pattern. Win rate measures signal hit rate instead. But strategies with low win rate and big win/loss ratio also work, so don't judge it in isolation.",
    },
  },
  {
    id: "RETURN_PCT",
    category: "backtest",
    labels: { ko: "현재 수익률 (Return %)", en: "Return % (현재 수익률)" },
    aliases: {
      ko: ["현재 수익률", "수익률"],
      en: ["return %", "return percent", "return pct"],
    },
    summary: {
      ko: "초기 자본 대비 현재 총 자산의 수익률(%).",
      en: "Current total assets vs. initial capital, in percent.",
    },
    why: {
      ko: "\"지금 평가액이 초기 자본 대비 몇 % 인가\". 시간이 흐르는 동안 전략 성과를 동일한 척도로 비교할 수 있게 해줌.",
      en: "\"Where is equity now versus where we started?\" Lets you track performance on the same scale as time progresses.",
    },
  },
  {
    id: "EQUITY",
    category: "backtest",
    labels: { ko: "평가액 (Equity)", en: "Equity (평가액 / 순자산)" },
    aliases: {
      ko: ["평가액", "순자산", "총자산"],
      en: ["equity", "net worth", "total assets"],
    },
    summary: {
      ko: "보유 주식 시가 + 현금의 합계. 시점의 전체 자산 가치.",
      en: "Sum of stock market value + cash at a given point in time.",
    },
    why: {
      ko: "주식 평가액만 보면 현금이 빠지고, 현금만 보면 주식 가치가 빠진다. 전체 자산 가치인 Equity 가 모든 수익률 지표의 기준점.",
      en: "Looking at just stock value ignores cash, and vice versa. Equity is the true total-assets number — the reference for every return metric.",
    },
  },
  {
    id: "CASH_RATIO",
    category: "backtest",
    labels: { ko: "현금 비율 (Cash %)", en: "Cash % (현금 비율)" },
    aliases: {
      ko: ["현금비율", "현금 비율"],
      en: ["cash ratio", "cash %", "cash percent"],
    },
    summary: {
      ko: "총 자산(주식 평가액 + 현금) 대비 남은 현금의 비율.",
      en: "Cash as a fraction of total assets (stock value + cash).",
    },
    why: {
      ko: "현금 비율이 높을수록 하락장 방어력과 저점 매수 여력이 크지만, 상승장에서는 상대 수익률이 낮다. 포지션 사이징 전략의 핵심 지표.",
      en: "More cash = stronger downside protection and dry powder for dips, but lower relative upside in a bull run. A key lever in position-sizing strategies.",
    },
  },

  // ─────────── 시장 ───────────
  {
    id: "ETF",
    category: "market",
    labels: { ko: "ETF (상장지수펀드)", en: "ETF (Exchange-Traded Fund)" },
    aliases: {
      ko: ["etf", "상장지수펀드"],
      en: ["etf", "exchange traded fund", "exchange-traded fund"],
    },
    summary: {
      ko: "거래소에서 주식처럼 거래되는 펀드 (예: SPY, QQQ).",
      en: "A fund that trades on an exchange like a stock (e.g. SPY, QQQ).",
    },
    why: {
      ko: "개별 종목을 일일이 고르지 않아도 ETF 하나로 분산 투자가 가능. 지수 ETF는 Buy & Hold 벤치마크로 자주 쓰이며, 섹터·테마·원자재·채권 등 다양한 자산군에 노출을 편하게 얻을 수 있게 해준다.",
      en: "One ETF gives instant diversification without hand-picking stocks. Index ETFs are common Buy & Hold benchmarks; sector, thematic, commodity, and bond ETFs provide easy exposure to many asset classes.",
    },
  },

  // ─────────── 데이터/포맷 ───────────
  {
    id: "CSV",
    category: "data",
    labels: { ko: "CSV (쉼표 구분 파일)", en: "CSV (Comma-Separated Values)" },
    aliases: {
      ko: ["csv"],
      en: ["csv", "comma separated values", "comma-separated values"],
    },
    summary: {
      ko: "엑셀/야후 파이낸스 등에서 받을 수 있는 쉼표 구분 텍스트 표 포맷.",
      en: "A comma-separated text table format available from Excel, Yahoo Finance, etc.",
    },
    why: {
      ko: "거의 모든 시세 제공처(야후 파이낸스, Alpaca, 증권사 다운로드)가 공통으로 지원한다. 스프레드시트, Python pandas 등 어느 툴에서든 읽히기 때문에 데이터 교환의 공용어.",
      en: "Supported by virtually every price source (Yahoo Finance, Alpaca, broker exports). Readable from spreadsheets, Python pandas, and more — the lingua franca of market-data exchange.",
    },
  },
  {
    id: "OHLCV",
    category: "data",
    labels: { ko: "OHLCV (시/고/저/종/거래량)", en: "OHLCV (Open/High/Low/Close/Volume)" },
    aliases: {
      ko: ["ohlcv", "시고저종", "시가 고가 저가 종가 거래량"],
      en: ["ohlcv", "open high low close volume"],
    },
    summary: {
      ko: "캔들 한 개를 정의하는 다섯 값: 시가, 고가, 저가, 종가, 거래량.",
      en: "The five values that define one candle: open, high, low, close, volume.",
    },
    why: {
      ko: "주가 차트의 모든 캔들은 이 5개 숫자로 표현된다. 거의 모든 기술적 지표가 이 5개 중 하나 또는 조합에서 계산되므로, 데이터 포맷의 공통 기본 단위.",
      en: "Every candle on a price chart is these five numbers. Nearly every technical indicator derives from one or a combination of them, making OHLCV the fundamental building block of market-data formats.",
    },
  },
  {
    id: "UPLOADED",
    category: "data",
    labels: { ko: "UPLOADED (업로드된 데이터)", en: "UPLOADED (User-uploaded data)" },
    aliases: {
      ko: ["업로드", "업로드 데이터"],
      en: ["uploaded", "user uploaded", "user data"],
    },
    summary: {
      ko: "사용자가 직접 업로드한 CSV 실데이터를 사용 중임을 나타내는 뱃지.",
      en: "Badge showing this ticker is using user-uploaded real CSV data.",
    },
    why: {
      ko: "외부 시세 API가 죽거나 잘못된 값을 줄 때, 미리 받아둔 공식 CSV 로 교차 검증. 같은 데이터셋으로 재현 가능한 장기 백테스트를 돌리는 데도 필수.",
      en: "When a price API goes down or returns wrong values, pre-downloaded official CSVs provide a cross-check. Also essential for reproducible long-term backtests on a fixed dataset.",
    },
  },
  {
    id: "SAMPLE",
    category: "data",
    labels: { ko: "SAMPLE (내장 샘플 데이터)", en: "SAMPLE (Built-in sample data)" },
    aliases: {
      ko: ["샘플", "샘플 데이터", "합성 데이터"],
      en: ["sample", "synthetic", "sample data", "synthetic data"],
    },
    summary: {
      ko: "앱에 내장된 합성 시계열. 데모/UI 확인용이며 실제 시장 데이터가 아님.",
      en: "Built-in synthetic time series for demo/UI purposes — not real market data.",
    },
    why: {
      ko: "업로드된 실데이터가 없어도 앱이 동작을 멈추지 않도록 쓰는 합성 데이터. 실제 매매 의사결정이나 실성과 평가에 사용하면 안 된다.",
      en: "Synthetic data keeps the app usable even without uploaded real data. Don't use it for actual trading decisions or performance claims.",
    },
  },
  {
    id: "EMPTY",
    category: "data",
    labels: { ko: "EMPTY (데이터 없음)", en: "EMPTY (No data)" },
    aliases: {
      ko: ["empty", "데이터 없음", "비어있음"],
      en: ["empty", "no data", "missing"],
    },
    summary: {
      ko: "해당 티커에 대한 업로드도 샘플도 없음. 업로드 없이는 백테스트 실패.",
      en: "No uploaded nor sample data for this ticker. Backtests will fail without an upload.",
    },
    why: {
      ko: "이 상태에서는 해당 티커가 포함된 백테스트가 중단된다. 티커 행의 Upload 버튼으로 공식 CSV 를 올리면 UPLOADED 로 전환된다.",
      en: "Backtests involving this ticker will stop here. Use the row's Upload button to provide an official CSV — the state will switch to UPLOADED.",
    },
  },
];

export const helpTopicById: Record<HelpTopicId, HelpTopic> = helpTopics.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<HelpTopicId, HelpTopic>
);

/** 언어별 가나다/알파벳 정렬기. */
function collator(lang: Language) {
  return new Intl.Collator(lang === "ko" ? "ko" : "en", { sensitivity: "base" });
}

/** 주어진 언어의 라벨 기준으로 정렬된 복사본. */
export function sortedTopicsByLabel(lang: Language): HelpTopic[] {
  const c = collator(lang);
  return [...helpTopics].sort((a, b) => c.compare(a.labels[lang], b.labels[lang]));
}

/**
 * 검색 쿼리 대비 토픽 점수.
 *   - 100: 필드 전체 일치
 *   - 90 : 토큰(공백/구분자 분리) 완전 일치
 *   - 60 : 토큰이 쿼리로 시작 (2자 이상 쿼리)
 *   - 30 : 필드 substring 포함 (3자 이상 쿼리)
 *   - 0  : 매칭 없음
 *
 * "rsi" 같은 짧은 쿼리가 임의의 r/s/i 포함 항목에 걸리지 않게, 기본은 토큰 단위.
 * 본문(summary/why) 은 검색 대상에서 제외 — 사용자 요구사항.
 */
export function scoreTopic(topic: HelpTopic, query: string, lang: Language): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const fields: string[] = [
    topic.labels[lang],
    topic.labels[lang === "ko" ? "en" : "ko"],
    ...topic.aliases[lang],
    ...topic.aliases[lang === "ko" ? "en" : "ko"],
    topic.id.toLowerCase(),
  ].map((s) => s.toLowerCase());

  const splitter = /[\s·/()\-,_&]+/;

  let best = 0;
  for (const field of fields) {
    if (!field) continue;
    if (field === q) {
      best = Math.max(best, 100);
      continue;
    }
    const tokens = field.split(splitter).filter(Boolean);
    for (const token of tokens) {
      if (token === q) best = Math.max(best, 90);
      else if (q.length >= 2 && token.startsWith(q)) best = Math.max(best, 60);
    }
    if (q.length >= 3 && field.includes(q)) {
      best = Math.max(best, 30);
    }
  }
  return best;
}
