import type { PrepStepCode } from "@/lib/types";

/** 상품 출시 준비 6단계.
 *  원본 '2026 스테이셔너리 생산 준비 현황표' 의 팀/담당자 매핑을 그대로 옮겼다. */
export const PREP_STEPS: {
  code: PrepStepCode;
  order: number;
  label: string;
  team: string;
  owner: string;
}[] = [
  { code: "design", order: 1, label: "디자인", team: "디자인", owner: "신명주 · 이나리" },
  { code: "print", order: 2, label: "인쇄", team: "인쇄", owner: "이계승" },
  { code: "photo", order: 3, label: "촬영", team: "촬영/보정", owner: "박희균" },
  { code: "styling", order: 4, label: "보정·연출", team: "촬영/보정", owner: "박희균" },
  { code: "webdesign", order: 5, label: "웹디자인", team: "웹디자인", owner: "이예솔 · 강다윤" },
  { code: "launch", order: 6, label: "출시", team: "운영", owner: "김설아" },
];

export const PREP_STEP_CODES = PREP_STEPS.map((s) => s.code);
export const PREP_STEP_TOTAL = PREP_STEPS.length;

export const prepStepMeta = (code: PrepStepCode) =>
  PREP_STEPS.find((s) => s.code === code) ?? PREP_STEPS[0];
