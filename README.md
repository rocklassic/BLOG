# insoon.dev — Astro 뼈대

## Spark에서 시작하기

1. 이 폴더를 `insoon-blog/site` 같은 곳에 두기
2. 지난 단계에서 만든 글과 이미지 옮기기:
   - `insoon-blog-content/posts/*.md` -> `site/src/content/posts/`
   - `public/images/` -> `site/public/images/`
3. 설치 및 실행

   npm install
   npm run dev

4. 브라우저(또는 SSH 포트포워딩)로 http://localhost:4321 확인

## 빌드

   npm run build

`dist/` 폴더에 완성된 정적 사이트가 나옵니다. 이게 Cloudflare Pages에 올라갈 그대로의 결과물입니다.
