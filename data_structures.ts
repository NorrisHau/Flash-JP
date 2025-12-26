export interface MemoryStatsEntry {
  /** 记忆强度评分（0-100） */
  score: number;
  /** 出现次数 */
  seenCount: number;
  /** 被标记记住次数 */
  rememberedCount: number;
  /** 最近一次学习时间戳 */
  lastSeenAt: number;
  /** 平均停留时长（秒） */
  avgStudySeconds: number;
}

export interface DailyPlan {
  /** 目标词数 */
  target: number;
  /** 今日已完成词数 */
  completed: number;
  /** 计划日期（YYYY-MM-DD） */
  date: string;
}

export interface StudyCalendarDay {
  /** 当天学习词数 */
  count: number;
}

export interface StudyCalendar {
  /** 以日期为 key 的学习记录 */
  [date: string]: StudyCalendarDay;
}

export interface ComboState {
  /** 连击次数 */
  count: number;
  /** 最近一次成功时间戳 */
  lastSuccessAt: number;
}

export type CardMode = "step" | "full";

export interface CardRevealState {
  /** 当前单词的展示阶段 */
  stage: "reading" | "kanji" | "meaning";
}

export interface ProductDataModel {
  /** 记忆强度统计（按词 ID） */
  memoryStats: Record<string, MemoryStatsEntry>;
  /** 每日学习计划 */
  dailyPlan: DailyPlan;
  /** 学习日历记录 */
  studyCalendar: StudyCalendar;
  /** 连击状态 */
  combo: ComboState;
  /** 卡片展示模式 */
  cardMode: CardMode;
  /** 卡片揭示状态 */
  cardRevealState: CardRevealState;
}

export const defaultProductData: ProductDataModel = {
  memoryStats: {},
  dailyPlan: {
    target: 20,
    completed: 0,
    date: new Date().toISOString().split("T")[0],
  },
  studyCalendar: {},
  combo: {
    count: 0,
    lastSuccessAt: 0,
  },
  cardMode: "step",
  cardRevealState: {
    stage: "reading",
  },
};
