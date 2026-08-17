// 연재 등록부.
// 새 연재를 시작할 때 여기에 한 항목 추가하면
// /series/ 목록과 /series/<id>/ 페이지가 자동으로 생깁니다.

export interface SeriesInfo {
  id: string;        // frontmatter 의 series 값과 일치해야 함
  name: string;      // 화면에 표시될 이름
  badge: string;      // "n화" 배지 앞에 붙는 짧은 라벨
  description: string;
  ongoing: boolean;  // 연재 중 여부
}

export const SERIES: SeriesInfo[] = [
  {
    id: "local-llm",
    name: "변호사의 로컬LLM 세팅기",
    badge: "LLM세팅기",
    description:
      "변호사가 DGX Spark 위에 로컬 AI 환경을 세팅하는 과정의 기록.",
    ongoing: true,
  },
  {
    id: "ssul",
    name: "썰썰썰",
    badge: "썰썰썰",
    description: "연재 밖의 생각들. AI를 둘러싼 사건과 질문을 풀어봅니다.",
    ongoing: true,
  },
  // 예시: 최신소식 연재를 시작한다면 아래 주석을 풀고 내용을 채우면 됩니다.
  // {
  //   id: "news",
  //   name: "최신소식",
  //   description: "법률 AI와 로컬 LLM 분야의 새 소식.",
  //   ongoing: true,
  // },
];

export function getSeries(id: string): SeriesInfo | undefined {
  return SERIES.find((s) => s.id === id);
}
