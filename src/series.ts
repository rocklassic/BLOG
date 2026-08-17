// 연재 등록부.
// 새 연재를 시작할 때 여기에 한 항목 추가하면
// /series/ 목록과 /series/<id>/ 페이지가 자동으로 생깁니다.

// 배지 색 팔레트. 크림(#faf9f6) 배경, 청록(#2f6f63) 포인트와 어울리는
// 차분한 파스텔 6색. 순서를 바꾸면 이미 배정된 시리즈의 배지 색이
// 통째로 바뀌므로, 색을 조정하고 싶으면 값만 고치고 순서는 유지할 것.
export const BADGE_PALETTE: { bg: string; text: string }[] = [
  { bg: "#d9e8e2", text: "#2f6f63" }, // 세이지 틸 (사이트 accent와 동일 계열)
  { bg: "#f0ddd1", text: "#a15c3e" }, // 테라코타
  { bg: "#ede0bd", text: "#8a6d1f" }, // 머스터드
  { bg: "#e2dcec", text: "#6b5a94" }, // 라벤더
  { bg: "#f0d9dd", text: "#a1546a" }, // 로즈
  { bg: "#d7e3ea", text: "#3f6c85" }, // 페일 스카이
];

export interface SeriesInfo {
  id: string;        // frontmatter 의 series 값과 일치해야 함
  name: string;      // 화면에 표시될 이름
  badge: string;      // "n화" 배지 앞에 붙는 짧은 라벨
  description: string;
  ongoing: boolean;  // 연재 중 여부
  colorIndex: number; // BADGE_PALETTE 안에서 이 시리즈가 등장한 순서.
                       // 새 시리즈를 추가할 때는 지금까지 쓰인 값 다음 숫자를
                       // 그대로 붙여쓸 것 (0, 1, 2, ...). 팔레트를 다 쓰면
                       // 다시 0부터 순환한다. 기존 항목의 colorIndex는
                       // 절대 바꾸지 말 것 — 바뀌면 그 시리즈 배지 색이 달라진다.
}

export const SERIES: SeriesInfo[] = [
  {
    id: "local-llm",
    name: "변호사의 로컬LLM 세팅기",
    badge: "LLM세팅기",
    description:
      "변호사가 DGX Spark 위에 로컬 AI 환경을 세팅하는 과정의 기록.",
    ongoing: true,
    colorIndex: 0,
  },
  {
    id: "ssul",
    name: "썰썰썰",
    badge: "썰썰썰",
    description: "연재 밖의 생각들. AI를 둘러싼 사건과 질문을 풀어봅니다.",
    ongoing: true,
    colorIndex: 1,
  },
  // 예시: 최신소식 연재를 시작한다면 아래 주석을 풀고 내용을 채우면 됩니다.
  // colorIndex는 다음 미사용 번호(여기서는 2)를 이어서 쓰면 됨.
  // {
  //   id: "news",
  //   name: "최신소식",
  //   description: "법률 AI와 로컬 LLM 분야의 새 소식.",
  //   ongoing: true,
  //   colorIndex: 2,
  // },
];

export function getSeries(id: string | undefined): SeriesInfo | undefined {
  return SERIES.find((s) => s.id === id);
}

export function getBadgeColor(id: string | undefined): { bg: string; text: string } {
  const series = getSeries(id);
  const index = series ? series.colorIndex : 0;
  return BADGE_PALETTE[index % BADGE_PALETTE.length];
}
