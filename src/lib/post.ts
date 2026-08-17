// 화수 기반 슬러그. 연재는 prefix 없이 "29", 썰썰썰처럼 prefix가 있는
// 시리즈는 "ss-1" 형태가 된다. 새 시리즈는 frontmatter에 seriesPrefix만
// 추가하면 이 함수가 자동으로 슬러그를 만들어준다.
export function postSlug(post: { data: { seriesPrefix: string; episode?: number } }): string {
  const { seriesPrefix, episode } = post.data;
  return seriesPrefix ? `${seriesPrefix}-${episode}` : `${episode}`;
}

export function postUrl(post: { data: { seriesPrefix: string; episode?: number } }): string {
  return `/${postSlug(post)}/`;
}
