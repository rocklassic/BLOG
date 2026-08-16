---
title: "송달문서(SCAN파일) 정리하기(2)"
pubDate: 2026-06-30
series: "local-llm"
episode: 28
description: "27화에서 추출 단계를 단단히 했다. PDF를 받아 당사자·출석일정·일시를 깨끗한 JSON으로 뽑는 데까지 왔다. 그런데 이건 전체 파이프라인의 한 토막일 뿐이다. 27화에서 그렸던 큰 그림을 다시…"
tags: ["법률실무", "자동화"]
needsDate: true   # TODO: dates.csv 에 실제 발행일 채우기
draft: false
---

27화에서 추출 단계를 단단히 했다. PDF를 받아 당사자·출석일정·일시를 깨끗한 JSON으로 뽑는 데까지 왔다. 그런데 이건 전체 파이프라인의 한 토막일 뿐이다. 27화에서 그렸던 큰 그림을 다시 펼쳐 본다. SCAN 폴더에 쌓인 스캔 서류 한 건은 아래 아홉 단계를 거쳐 분류·등록·통보된다.

| 단계 | 하는 일 | 27화 | 28화 |
|-|-|-|-|
| 1. 다운로드 | SCAN 폴더의 PDF를 ATOM에 내려받기 | ● | |
| 2. 이미지 변환 | 앞 3쪽을 PNG로 쪼개기 | ● | |
| 3. 추출 | 당사자·출석일정·일시를 JSON으로 뽑기 | ● | |
| 4. 후처리 | 깨진 JSON 정리 | ● | |
| 5. 폴더 분류 | 당사자로 폴더를 찾거나 만들어 이동 | | ● |
| 6. 이름 변경 | `피고인_서류이름_월일.pdf`로 | | ● |
| 7. 캘린더 | 출석 일정이 있으면 등록 | | ● |
| 8. 사건 일지 | 피고인 폴더 독스에 한 줄 누적 | | ● |
| 9. 통보 | 텔레그램으로 결과·링크 전송 | | ● |

27화는 1 ~ 4단계, 곧 "읽어서 JSON으로 뽑는" 데까지였다. 이번 화는 5 ~ 9단계, 그 JSON을 받아 실제로 일을 시킨다. 폴더를 나누고, 파일을 옮기고, 이름을 바꾸고, 일정을 등록하고, 사건 일지를 쌓고, 결과를 알린다. 1~9단계를 한 줄로 꿰어, 한 파일이 들어왔을 때 끝까지 처리하는 스크립트 — `process_one.sh` — 를 만든다.

SCAN 폴더 전체를 자동으로 훑는 것과, 그 처리를 정해진 시각이나 폰 명령으로 거는 것은 다음 화의 몫이다. 이번엔 "한 건을 완전하게 처리하는 한 벌"을 완성하는 것이 목표다.

부품을 하나씩 검증하며 얹는다. 추출에 폴더 이동을 얹고, 거기에 이름변경을, 캘린더를, 일지를, 통보를 차례로 더한다. 한꺼번에 다 짜놓고 돌리면 어디서 틀렸는지 찾기 어렵기 때문이다. 검증용으로 성격이 다른 세 파일을 준비했다. 공판기일통지서 한 장(scan0002), 공동피고인 공소장(scan0003), 반성문(scan0001)이다. 각각 출석 일정이 있는 것과 없는 것, 당사자가 한 명인 것과 두 명인 것을 섞었다. 부품을 얹을 때마다 이 셋으로 돌려, 분기마다 다른 경로를 타는지 본다.

---

## 폴더 구조와 불변식

먼저 구글 드라이브의 폴더 구조를 정했다. `Ai Test` 아래 입력함인 SCAN과 미분류함인 INBOX를 형제로 두고, 피고인 폴더들은 별도 상위 폴더 아래에 모은다. 처리 결과는 이렇게 갈린다.

- 당사자를 가려낼 수 있으면 → 그 사람 폴더로.
- 당사자를 못 가려내면 → INBOX로.

여기서 한 가지 규칙을 세웠다. **처리한 파일은 SCAN에 남기지 않는다.** 처리가 끝나면 반드시 다른 폴더로 옮긴다. 그러면 SCAN에 남아 있는 것은 항상 "아직 처리되지 않은 새 파일"이라는 신뢰할 수 있는 상태가 된다. 이 규칙을 지키면, 나중에 "SCAN을 훑어 처리"를 반복해도 이미 처리한 것을 다시 건드리지 않는다.

폴더 분류 기준도 다시 짚는다. 27화에서 정한 대로, 폴더는 서류 종류가 아니라 당사자로 가른다. 반성문이든 공소장이든 불송치결정서든, 그 사람 것이면 그 사람 폴더로 들어간다. INBOX로 가는 것은 "어느 폴더로 갈지 알 수 없는 것" — 당사자를 못 읽은 것 — 뿐이다.

---

## 폴더 찾기, 없으면 만들기

당사자 이름으로 폴더를 정한다. 공동피고인이면 이름을 가나다순으로 정렬해 밑줄로 잇는다. 같은 사건의 같은 서류가 다음에 또 들어왔을 때, 모델이 이름 순서를 다르게 뽑아도 폴더가 둘로 갈라지지 않게 하려는 것이다. 정렬해두면 등장 순서가 어떻든 늘 같은 폴더명이 나온다.

```bash
FOLDER_NAME="$(printf '%s' "$JSON" | jq -r '
  (.["당사자"] // []) | map(select(. != "")) | sort | join("_")
')"
```

추출 JSON의 `당사자` 배열을 꺼내, 빈 값을 거르고(`select(. != "")`), 가나다순으로 정렬한 뒤(`sort`), 밑줄로 잇는다(`join("_")`). 배열이 비어 있으면 `// []`로 빈 배열을 대신 써 오류를 막는다. 결과는 폴더명 문자열이다.

폴더명이 정해지면, 피고인 상위 폴더에서 그 이름의 폴더를 찾는다. 있으면 그 폴더를, 없으면 새로 만든다.

```bash
TARGET_ID="$(gog drive ls --parent "$DEFENDANT_ROOT" --json --results-only \
  | jq -r --arg n "$FOLDER_NAME" '.[] | select(.name==$n) | .id' | head -n1)"

if [ -z "$TARGET_ID" ]; then
  TARGET_ID="$(gog drive mkdir "$FOLDER_NAME" --parent "$DEFENDANT_ROOT" \
    --json --results-only | jq -r '.id')"
fi
```

첫 줄에서 `gog drive ls`로 피고인 상위 폴더(`$DEFENDANT_ROOT`)의 목록을 받아, 이름이 폴더명과 일치하는 것의 ID를 뽑는다. `--arg n "$FOLDER_NAME"`은 셸 변수를 jq 안으로 안전하게 넘기는 방법이다. 그렇게 찾은 `TARGET_ID`가 비어 있으면(`-z`), 즉 그 폴더가 없으면 `gog drive mkdir`로 만들고 새 ID를 받는다. 이 "찾고, 없으면 만든다" 패턴은 뒤에 사건 일지를 만들 때도 똑같이 쓴다.

여기까지 얹고 scan0003(공동피고인 공소장)으로 처음 돌려봤다. 추출과 폴더 생성이 한 번에 떴다.

```
--- extracted ---
{
  "당사자": ["오OO", "이OO"],
  "출석일정있음": false,
  "일시": null,
  "장소": null,
  "사건번호": "2026년 형제0000호",
  "서류이름": "공소장",
  "서류요약": "마약류 관리법 위반 공소"
}
[*] defendant folder: 오OO_이OO
    folder not found, creating...
    created: 1oh2l_yT...
moved to 오OO_이OO (1oh2l_yT...)
```

두 이름이 가나다순으로 정렬돼 `오OO_이OO`가 됐고(추출 순서가 어떻든 이 순서로 고정된다), 그 폴더가 없으니 새로 만들어(`folder not found, creating...`) 거기로 옮겼다. 폴더 분기의 "없으면 생성" 경로가 탔다.

---

## 파일을 옮기면 SCAN에서 빠지는가

폴더가 정해졌으니 파일을 옮긴다. 여기서 확인이 필요했다. 구글 드라이브는 한 파일이 여러 폴더에 동시에 속할 수 있다. 그래서 "새 폴더에 추가"만 하면 원래 폴더(SCAN)에도 그대로 남을 수 있다. 그러면 앞서 세운 불변식 — 처리한 것은 SCAN에 안 남긴다 — 이 깨진다.

`gog drive move`가 파일을 새 폴더로 옮기면서 원래 폴더에서도 빼내는지 직접 봤다.

```bash
gog drive move <파일ID> --parent <목적지폴더ID> --json --results-only
```

`move`에 옮길 파일 ID와 목적지 폴더 ID를 준다. `--json --results-only`는 결과를 사람 읽는 표가 아니라 JSON으로만 받아, 뒤에서 jq로 파싱하기 위한 것이다.

옮긴 뒤 반환된 결과에서 그 파일이 속한 폴더 목록을 보니 목적지 폴더 하나뿐이었다. SCAN이 빠진 것이다. 실제로 옮긴 직후 SCAN 목록을 다시 조회하니 scan0003이 사라져 있었다. `move`는 파일을 새 폴더로 옮길 때 원래 있던 폴더에서 자동으로 빼낸다. 따로 빼는 처리를 넣지 않아도 불변식이 지켜진다.

---

## 파일 이름 바꾸기

옮긴 직후, 파일 이름을 바꾼다. 스캐너가 붙인 `scan0002.pdf` 같은 이름은 폴더에 들어가도 무엇인지 알 수 없다. `피고인_서류이름_처리월일.pdf` 형식으로 바꾼다.

```bash
DT="$(printf '%s' "$DOCTYPE" | tr -d '/\\:*?"<>|' | tr ' ' '_')"
MMDD="$(date +%m%d)"
NEWNAME="${FOLDER_NAME}_${DT}_${MMDD}.pdf"
gog drive rename "$FILE_ID" "$NEWNAME"
```

첫 줄에서 서류이름(`$DOCTYPE`)에 파일명으로 못 쓰는 문자(`/ \ : * ? " < > |`)를 `tr -d`로 걷어내고, 공백을 밑줄로 바꾼다(`tr ' ' '_'`). 둘째 줄에서 처리 월일을 `0629` 같은 네 자리로 만든다(`date +%m%d`). 셋째 줄에서 폴더명·서류이름·월일을 이어 새 파일명을 짓고, 넷째 줄에서 `gog drive rename`으로 적용한다. 처리 월일을 붙이는 것은, 같은 사람에게 같은 종류 서류가 또 와도 이름이 겹치지 않게 하려는 것이다. 사건번호는 있을 때도 없을 때도 있어 들쭉날쭉하지만, 처리 날짜는 어떤 서류든 항상 있어 일관된다.

이름변경을 얹고 scan0003을 다시 돌리니, 같은 흐름 끝에 한 줄이 더 붙었다.

```
[*] defendant folder: 오OO_이OO
renamed to 오OO_이OO_공소장_0629.pdf
```

`오OO_이OO_공소장_0629.pdf`. 폴더만 열어도 누구의 무슨 서류가 언제 들어왔는지 보인다.

---

## 출석 일정이 있으면 캘린더에

추출 JSON의 `출석일정있음`이 `true`이고 일시가 있을 때만 캘린더에 일정을 만든다. 26화에서 손으로 검증한 `gog calendar create`를 그대로 쓴다.

일시는 모델이 `2026-06-11 15:00` 형식으로 주므로, RFC3339(`2026-06-11T15:00:00+09:00`)로 바꿔야 한다. 가운데 공백을 `T`로 바꾸고 끝에 시간대를 붙인다. 종료는 통지서에 없으니 시작 1시간 뒤로 잡는다.

```bash
START="$(printf '%s' "$WHEN" | sed 's/ /T/')"":00+09:00"
END="$(date -d "$WHEN 1 hour" +%Y-%m-%dT%H:%M:%S+09:00)"
gog calendar create "$CAL_ID" \
  --summary "[기일] ${FOLDER_NAME} / ${DOCTYPE}" \
  --from "$START" --to "$END" \
  --location "$PLACE" \
  --description "사건번호: ${CASENO} / ${SUMMARY} / 출처: ${NEWNAME}"
```

첫 줄에서 모델이 준 일시(`$WHEN`)의 가운데 공백을 `sed`로 `T`로 바꾸고, 초와 시간대(`:00+09:00`)를 붙여 시작 시각을 RFC3339로 만든다. 둘째 줄에서 `date -d`로 시작 1시간 뒤를 계산해 종료 시각으로 둔다. 그다음 `gog calendar create`로 일정을 만드는데, 제목(`--summary`), 시작·종료(`--from`·`--to`), 장소(`--location`), 설명(`--description`)을 넣는다.

제목은 `[기일]`로 두었다. 27화에서 캘린더 분기를 "공판기일통지서인가"가 아니라 "출석 일시가 있는가"로 바꿨으므로, 공판기일뿐 아니라 경찰 출석 같은 것도 잡힌다. 종류 이름(`[공판기일]`)으로 제목을 고정하면 맞지 않으니, 출석 일정 전반을 가리키는 `[기일]`로 둔다. 장소(`--location`)를 넣는 것을 잊지 않는다. 어느 법정·어느 청으로 가야 하는지가 일정에서 가장 중요한 정보다.

이 분기는 앞서 돌린 scan0003으로는 검증할 수 없다. 공소장은 `출석일정있음`이 `false`라 캘린더를 건너뛰기 때문이다. 그래서 캘린더 분기는 scan0002(공판기일통지서)로 본다. 추출 결과부터 다르다.

```
--- extracted ---
{
  "당사자": ["김OO"],
  "출석일정있음": true,
  "일시": "2026-06-11 15:00",
  "장소": "서울OO지방법원 408호 법정",
  "사건번호": "2025노0000",
  "서류이름": "공판기일통지서",
  "서류요약": "공판기일 지정 통지"
}
[*] defendant folder: 김OO
renamed to 김OO_공판기일통지서_0629.pdf
calendar: 등록됨
```

`출석일정있음`이 `true`고 일시가 있으니 캘린더 분기로 들어가 `calendar: 등록됨`이 떴다. 같은 자리에서 scan0003은 이 줄 없이 곧장 다음으로 넘어갔다. 사실(출석 일시 유무)에 따라 두 파일이 서로 다른 경로를 탄 것이다.

---

## 사건 일지 쌓기

기일만 관리하는 게 아니다. "며칠에 반성문이 들어왔다", "며칠에 불송치됐다" — 그 사람 앞으로 들어온 모든 서류의 이력을 시간순으로 쌓는 사건 일지가 필요하다. 피고인 폴더 안에 `피고인_사건요약` 구글 독스를 두고, 처리할 때마다 한 줄씩 누적한다.

폴더 찾기와 똑같은 패턴이다. 폴더 안에서 일지 독스를 이름으로 찾아, 있으면 그 문서에 이어 쓰고 없으면 만든다. `gog docs insert`는 위치를 지정하지 않으면 문서 끝에 붙인다.

```bash
DOCNAME="${FOLDER_NAME}_사건요약"
DOC_ID="$(gog drive ls --parent "$TARGET_ID" --json --results-only \
  | jq -r --arg n "$DOCNAME" '.[] | select(.name==$n) | .id' | head -n1)"
if [ -z "$DOC_ID" ]; then
  DOC_ID="$(gog docs create "$DOCNAME" --parent "$TARGET_ID" \
    --json --results-only | jq -r '.id')"
fi
gog docs insert "$DOC_ID" "${LOG_LINE}
"
```

일지 독스 이름을 `폴더명_사건요약`으로 정하고, 피고인 폴더(`$TARGET_ID`) 안에서 그 이름의 독스를 찾는다. 폴더 찾기와 같은 "찾고, 없으면 만든다" 구조다 — 없으면(`-z`) `gog docs create`로 만든다. 마지막 줄에서 `gog docs insert`로 한 줄(`$LOG_LINE`)을 문서 끝에 붙인다. 텍스트 끝에 줄바꿈을 넣어, 다음에 또 쓸 때 새 줄에서 시작하게 한다.

한 줄은 `처리날짜 | 서류이름 | 요약` 형식이고, 출석 일정이 있으면 뒤에 기일을 덧붙인다. 그러면 일지가 한 줄씩 시간순으로 쌓인다.

일지를 얹고 scan0002로 돌린 뒤, 김OO 폴더를 조회했다.

```bash
gog drive ls --parent <김OO폴더ID> --json --results-only | jq -r '.[].name'
```

피고인 폴더 안의 파일·문서 이름만 뽑아 본다.

```
김OO_사건요약
김OO_공판기일통지서_0629.pdf
```

PDF 옆에 `김OO_사건요약` 독스가 새로 생겼다. 일지 안을 들여다본다.

```bash
DOCID=$(gog drive ls --parent <김OO폴더ID> --json --results-only \
  | jq -r '.[] | select(.name=="김OO_사건요약") | .id')
gog docs cat "$DOCID"
```

첫 줄에서 일지 독스의 ID를 변수에 담고, 둘째 줄에서 `gog docs cat`으로 그 내용을 화면에 찍는다.

```
2026-06-29 | 공판기일통지서 | 공판기일 지정 통지 | 기일 2026-06-11 15:00 @ 서울OO지방법원 408호 법정
```

첫 줄이 들어갔다. 처리날짜·서류이름·요약에, 출석 일정이 있으니 뒤에 기일까지 붙었다.

---

## 처리 순서와 최악의 실패

여기서 순서를 의식적으로 정했다. 파일 이동을 먼저 하고, 캘린더·일지·통보를 그 뒤에 둔다. 이유는 실패했을 때의 상태 때문이다.

만약 캘린더 등록이 실패한다면? 그때 파일은 이미 옮겨져 제 폴더에 있다. 빠진 것은 캘린더 일정 하나뿐이다. 그리고 그 사실은 통보로 알 수 있다. 최악의 실패 상태가 "파일은 분류됐는데 일정이 누락된 것"이고, 이건 통보를 보고 사람이 직접 일정을 넣으면 복구된다. 반대로 캘린더를 먼저 걸고 이동을 나중에 하면, 일정은 잡혔는데 파일이 SCAN에 남아 다음에 또 처리되며 일정이 중복될 수 있다. 그래서 이동을 먼저 둔다.

---

## 결과 알리기

마지막은 텔레그램 통보다. 처리 한 건이 끝날 때마다 무엇이 어떻게 됐는지 보낸다. 봇으로 메시지를 보내는 것은 `curl` 한 줄이면 되는데, 봇 토큰을 스크립트에 직접 박으면 노출되기 쉬워 별도 파일에서 읽어오게 했다.

```bash
notify() {
  [ -f "$TG_ENV" ] || return 0
  . "$TG_ENV"
  curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" --data-urlencode "text=$1" >/dev/null || true
}
```

`notify`는 한 줄짜리 통보 함수다. 먼저 토큰 파일(`$TG_ENV`, 여기선 `~/.config/court-pipeline/telegram.env`)이 있는지 보고, 있으면 `.`로 그 파일을 읽어들여 `TELEGRAM_BOT_TOKEN`·`TELEGRAM_CHAT_ID` 두 값을 가져온다. 그 env 파일은 아래 두 줄이 전부다.

```bash
TELEGRAM_BOT_TOKEN=123456:AAA...
TELEGRAM_CHAT_ID=987654321
```

그다음 텔레그램 봇 API의 `sendMessage`에 봇 토큰·받는 사람(`chat_id`)·보낼 글(`$1`)을 준다. `--data-urlencode`는 줄바꿈이나 특수문자가 든 메시지를 안전하게 실어 보낸다. 토큰을 코드 밖 파일에 두면, 스크립트를 블로그에 싣거나 남에게 보여줄 때 토큰이 따라 나가지 않는다.

메시지에는 피고인·서류이름·요약, 폴더(새로 생성인지 기존인지), 출석 일정이 있으면 기일, 그리고 구글 드라이브 파일·폴더 링크를 담는다. 폴더가 새로 생성됐다는 표시는 이름 오독을 잡는 데 쓰인다. 통보에 "폴더: 한OO (새로 생성)"이 뜨면, 그게 오독으로 생긴 엉뚱한 폴더인지 사람이 바로 알아챈다. 링크는 우리가 이미 가진 파일 ID·폴더 ID로 조립한다.

```bash
FILE_URL="https://drive.google.com/file/d/${FILE_ID}/view"
FOLDER_URL="https://drive.google.com/drive/folders/${TARGET_ID}"
```

파일 링크와 폴더 링크를 각각 정해진 URL 형식에 ID만 끼워 만든다. 별도 조회 없이, 처리 과정에서 이미 손에 쥔 `$FILE_ID`·`$TARGET_ID`로 조립하니 추가 호출이 없다.

통보를 얹고 scan0002로 돌리니, 스크립트 끝에 `notified`가 떴고 텔레그램에 메시지가 도착했다. 메시지 끝의 파일 링크와 폴더 링크를 눌러보니 각각 그 파일과 김OO 폴더로 바로 들어갔다. 오독을 발견하면 폴더 링크를 눌러 구글 드라이브에서 이름을 고치면 되고, 일정이 누락됐으면 파일을 열어 직접 처리하면 된다.

![KakaoTalk_20260630_130122061.jpg](/images/28-송달문서-scan파일-정리하기-2/01.jpg)

---

## 한 파일이 끝까지 돈다

부품을 다 얹고, 세 파일을 차례로 돌려 전 단계가 한 흐름으로 도는지 봤다. 처리 결과는 서류 성격에 따라 갈렸다.

**scan0002 — 공판기일통지서(김OO).** 추출 → 김OO 폴더 생성 → 이동 → `김OO_공판기일통지서_0629.pdf`로 이름변경 → 출석 일시가 있어 6월 11일 캘린더 등록 → 사건 일지에 기일까지 붙은 첫 줄 → 링크 붙인 통보. 출석 일정이 있는 경로의 모든 단계를 탔다.

**scan0003 — 공소장(오OO·이OO).** 추출 → 두 이름 정렬해 `오OO_이OO` 폴더 생성 → 이동 → `오OO_이OO_공소장_0629.pdf`로 이름변경 → `출석일정있음`이 `false`라 캘린더는 건너뜀 → 일지에 한 줄 → 통보. 공동피고인 폴더명 정렬과, 캘린더를 건너뛰는 경로가 확인됐다.

**scan0001 — 반성문(한OO).** 추출 → `한OO` 폴더 생성 → 이동 → `한OO_반성문_0629.pdf`로 이름변경 → 캘린더 건너뜀 → 일지에 한 줄 → 통보.

```
[*] defendant folder: 한OO
renamed to 한OO_반성문_0629.pdf
logged
notified
```

세 파일이 같은 스크립트를 타면서도, 사실(출석 일시 유무, 당사자 수)에 따라 서로 다른 경로로 갈렸다. 공판기일통지서만 캘린더에 들어갔고, 공소장은 두 이름이 정렬돼 한 폴더로 묶였고, 반성문은 캘린더 없이 폴더와 일지에만 남았다. 종류별로 분기를 두지 않았는데도 서류 종류에 맞는 처리가 나온 것이다. 분기 기준을 종류가 아니라 사실로 둔 설계가 작동한 셈이다.

같은 사람의 두 번째 파일을 넣었을 때도 봤다. 이번엔 폴더를 새로 만들지 않고 기존 폴더를 재사용했고(`found existing`), 일지에는 둘째 줄이 첫 줄 아래로 쌓였다. 폴더 분기의 두 경로 — 없으면 생성, 있으면 재사용 — 가 모두 작동했다.

---

## 스크립트 전체와 만드는 법

지금까지 조각으로 본 것을 한 파일로 모은 것이 `process_one.sh`다. 앞에서 부품별로 설명했으니, 여기서는 전체를 한 벌로 싣는다. 따라 만들 때는 이 내용을 그대로 쓰면 된다(폴더·캘린더 ID는 각자 환경의 값으로 바꾼다).

먼저 그 ID들을 알아내는 법이다. 폴더 ID는 두 가지로 얻는다. 웹에서는 구글 드라이브에서 그 폴더를 연 뒤 주소창을 보면 된다. `https://drive.google.com/drive/folders/`**`1357Nau5yP0bh59z9eIwT5sxWVwMoiDpv`** 처럼, `folders/` 뒤의 긴 문자열이 그 폴더의 ID다. 명령으로는 상위 폴더를 `gog drive ls`로 훑어 이름과 ID를 함께 본다.

```bash
gog drive ls --parent <상위폴더ID> --json --results-only \
  | jq -r '.[] | "\(.id)\t\(.name)"'
```

상위 폴더 안의 항목들을 `ID(탭)이름` 형식으로 나열한다. 여기서 SCAN·INBOX·사건 폴더의 ID를 골라 스크립트에 넣으면 된다. 맨 처음 최상위 폴더 ID 하나만 웹 주소창에서 얻으면, 그 아래는 이 명령으로 따라 내려갈 수 있다.

캘린더 ID는 구글 캘린더 웹에서 본다. 왼쪽 캘린더 목록에서 해당 캘린더의 설정(점 세 개 → 설정 및 공유)으로 들어가 "캘린더 통합" 항목을 보면 `...@group.calendar.google.com` 형태의 캘린더 ID가 있다. 기본 캘린더라면 ID가 본인 지메일 주소와 같다.

스크립트가 기대하는 주변 파일이 셋 있다. 같은 폴더의 `prompt.txt`(추출 프롬프트, 27화), `clean.jq`(추출 JSON 후처리 필터, 27화), 그리고 `~/.config/court-pipeline/telegram.env`(텔레그램 토큰)다. 앞의 둘은 27화에서 만들었고, env 파일은 위 통보 절에서 본 두 줄짜리다.

파일은 `~/court-test/` 아래 둔다. 셸에서 아래처럼 `cat`으로 내용을 통째로 써넣는다. `<< 'SCRIPT_EOF'`부터 `SCRIPT_EOF`까지가 파일 내용이 되고, 따옴표로 감싼 `'SCRIPT_EOF'`라 중간의 `$변수`가 지금 치환되지 않고 글자 그대로 들어간다.

<details>
<summary>process_one.sh 전체 보기 (클릭해서 펼치기)</summary>

```bash
cat > ~/court-test/process_one.sh << 'SCRIPT_EOF'
#!/usr/bin/env bash
set -euo pipefail

# ===== 폴더 / 캘린더 ID (각자 환경의 값으로 교체) =====
SCAN_ID="<SCAN 폴더 ID>"
INBOX_ID="<INBOX 폴더 ID>"
DEFENDANT_ROOT="<피고인 상위 폴더 ID>"
CAL_ID="<캘린더 ID>"

# ===== 설정 =====
MODEL="qwen3-vl:8b-instruct"
DPI=200
MAX_PAGES=3
DIR="$(dirname "$0")"
PROMPT_FILE="$DIR/prompt.txt"
JQ_FILE="$DIR/clean.jq"
TG_ENV="$HOME/.config/court-pipeline/telegram.env"

[ $# -ge 1 ] || { echo "usage: $0 <fileId>" >&2; exit 1; }
FILE_ID="$1"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

notify() {
  [ -f "$TG_ENV" ] || return 0
  . "$TG_ENV"
  curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" --data-urlencode "text=$1" >/dev/null || true
}

FILE_URL="https://drive.google.com/file/d/${FILE_ID}/view"

# ----- 1) 다운로드 -----
PDF="$WORKDIR/in.pdf"
gog drive download "$FILE_ID" --out "$PDF" >/dev/null 2>&1
[ -f "$PDF" ] || { echo "download failed: $FILE_ID" >&2; exit 1; }

# ----- 2) 앞 3쪽 PNG -----
pdftoppm -png -r "$DPI" -f 1 -l "$MAX_PAGES" "$PDF" "$WORKDIR/page" 2>/dev/null
shopt -s nullglob
PAGES=( "$WORKDIR"/page*.png )
shopt -u nullglob
[ ${#PAGES[@]} -gt 0 ] || { echo "png convert failed" >&2; exit 1; }

# ----- 3) 추출 + 후처리 (27화) -----
PROMPT="$(cat "$PROMPT_FILE")"
RAW="$(ollama run "$MODEL" "$PROMPT" "${PAGES[@]}" 2>/dev/null)"
NOESC="$(printf '%s' "$RAW" | sed 's/\x1b\[[0-9;?]*[a-zA-Z]//g')"
ONELINE="$(printf '%s' "$NOESC" | tr '\n\t' '  ')"
FIXED="$(printf '%s' "$ONELINE" | sed -E 's/"[[:space:]]*"/"/g')"

JSON="$(printf '%s' "$FIXED" | jq -c -f "$JQ_FILE" 2>/dev/null)" || {
  echo "extract/parse failed for $FILE_ID" >&2
  notify "[처리실패] 추출/파싱 실패
파일: ${FILE_URL}"
  exit 1
}

echo "--- extracted ---" >&2
printf '%s\n' "$JSON" | jq . >&2

DOCTYPE="$(printf '%s' "$JSON" | jq -r '.["서류이름"] // "불명"')"
SUMMARY="$(printf '%s' "$JSON" | jq -r '.["서류요약"] // ""')"
HAS_SCHED="$(printf '%s' "$JSON" | jq -r '.["출석일정있음"] // false')"
WHEN="$(printf '%s' "$JSON" | jq -r '.["일시"] // ""')"
PLACE="$(printf '%s' "$JSON" | jq -r '.["장소"] // ""')"
CASENO="$(printf '%s' "$JSON" | jq -r '.["사건번호"] // ""')"

# ----- 4) 폴더명 결정 -----
FOLDER_NAME="$(printf '%s' "$JSON" | jq -r '
  (.["당사자"] // []) | map(select(. != "")) | sort | join("_")
')"

if [ -z "$FOLDER_NAME" ]; then
  echo "[*] no defendant -> inbox" >&2
  gog drive move "$FILE_ID" --parent "$INBOX_ID" --json --results-only >/dev/null
  INBOX_URL="https://drive.google.com/drive/folders/${INBOX_ID}"
  notify "[처리완료] 당사자 불명 / ${DOCTYPE}
요약: ${SUMMARY}
폴더: INBOX (당사자 못 찾음)
파일: ${FILE_URL}
폴더: ${INBOX_URL}"
  exit 0
fi

echo "[*] defendant folder: $FOLDER_NAME" >&2

# ----- 5) 폴더 찾기/만들기 -----
TARGET_ID="$(gog drive ls --parent "$DEFENDANT_ROOT" --json --results-only 2>/dev/null \
  | jq -r --arg n "$FOLDER_NAME" '.[] | select(.name==$n) | .id' | head -n1)"

if [ -z "$TARGET_ID" ]; then
  FOLDER_STATE="새로 생성"
  TARGET_ID="$(gog drive mkdir "$FOLDER_NAME" --parent "$DEFENDANT_ROOT" --json --results-only | jq -r '.id')"
else
  FOLDER_STATE="기존"
fi

FOLDER_URL="https://drive.google.com/drive/folders/${TARGET_ID}"

# ----- 6) 이동 -----
gog drive move "$FILE_ID" --parent "$TARGET_ID" --json --results-only >/dev/null

# ----- 7) 이름 변경 -----
DT="$(printf '%s' "$DOCTYPE" | tr -d '/\\:*?"<>|' | tr ' ' '_')"
[ -n "$DT" ] || DT="불명"
TODAY="$(date +%Y-%m-%d)"
MMDD="$(date +%m%d)"
NEWNAME="${FOLDER_NAME}_${DT}_${MMDD}.pdf"
gog drive rename "$FILE_ID" "$NEWNAME" >/dev/null
echo "renamed to $NEWNAME" >&2

# ----- 8) 캘린더 등록 -----
CAL_RESULT=""
if [ "$HAS_SCHED" = "true" ] && [ -n "$WHEN" ]; then
  START="$(printf '%s' "$WHEN" | sed 's/ /T/')"":00+09:00"
  END="$(date -d "$WHEN 1 hour" +%Y-%m-%dT%H:%M:%S+09:00 2>/dev/null || echo "")"
  if [ -n "$END" ]; then
    gog calendar create "$CAL_ID" \
      --summary "[기일] ${FOLDER_NAME} / ${DOCTYPE}" \
      --from "$START" --to "$END" \
      --location "$PLACE" \
      --description "사건번호: ${CASENO} / ${SUMMARY} / 출처: ${NEWNAME}" \
      --json --results-only >/dev/null 2>&1 && CAL_RESULT="등록됨" || CAL_RESULT="등록실패"
  fi
  echo "calendar: $CAL_RESULT" >&2
fi

# ----- 9) 사건 일지 독스 -----
DOCNAME="${FOLDER_NAME}_사건요약"
DOC_ID="$(gog drive ls --parent "$TARGET_ID" --json --results-only 2>/dev/null \
  | jq -r --arg n "$DOCNAME" '.[] | select(.name==$n) | .id' | head -n1)"
if [ -z "$DOC_ID" ]; then
  DOC_ID="$(gog docs create "$DOCNAME" --parent "$TARGET_ID" --json --results-only | jq -r '.id')"
fi
LOG_LINE="${TODAY} | ${DOCTYPE} | ${SUMMARY}"
if [ "$HAS_SCHED" = "true" ] && [ -n "$WHEN" ]; then
  LOG_LINE="${LOG_LINE} | 기일 ${WHEN} @ ${PLACE}"
fi
gog docs insert "$DOC_ID" "${LOG_LINE}
" >/dev/null 2>&1 && echo "logged" >&2 || echo "log failed" >&2

# ----- 10) 텔레그램 통보 -----
MSG="[처리완료] ${FOLDER_NAME} / ${DOCTYPE}
요약: ${SUMMARY}
폴더: ${FOLDER_NAME} (${FOLDER_STATE})"
if [ "$HAS_SCHED" = "true" ] && [ -n "$WHEN" ]; then
  MSG="${MSG}
기일: ${WHEN} @ ${PLACE}
캘린더: ${CAL_RESULT}"
fi
MSG="${MSG}
파일: ${FILE_URL}
폴더: ${FOLDER_URL}"
notify "$MSG"
echo "notified" >&2
SCRIPT_EOF
```

</details>

써넣은 뒤 실행 권한을 준다. 이 한 줄이 없으면 `./process_one.sh`로 못 부른다.

```bash
chmod +x ~/court-test/process_one.sh
```

실행은 처리할 파일의 구글 드라이브 fileId를 인자로 넘긴다. fileId는 SCAN 폴더를 `gog drive ls`로 조회하면 나온다.

```bash
cd ~/court-test
./process_one.sh <fileId>
```

부품 설명에서 안 짚은 부분만 덧붙인다. 맨 위 `set -euo pipefail`은 오류가 나면 즉시 멈추고(`-e`), 정의 안 된 변수를 쓰면 막고(`-u`), 파이프 중간이 실패해도 잡는다(`-o pipefail`) — 중간에 틀린 채로 끝까지 도는 것을 막는 안전장치다. `WORKDIR="$(mktemp -d)"`와 `trap 'rm -rf "$WORKDIR"' EXIT`는 페이지 PNG를 둘 임시 폴더를 만들고, 스크립트가 어떻게 끝나든(성공이든 실패든) 그 폴더를 지우게 한다. 1~10번 주석이 앞에서 본 처리 단계 그대로다.

---

## 오늘의 정리

오늘은 한 파일을 끝까지 처리하는 스크립트를 완성했다.

- **SCAN 불변식**: 처리한 파일은 반드시 SCAN에서 빼낸다. `gog drive move`가 파일을 새 폴더로 옮길 때 원래 폴더에서 자동으로 빼내므로, SCAN에 남은 것은 항상 미처리 파일이 된다.
- **찾고, 없으면 만든다**: 폴더도 사건 일지 독스도 같은 패턴으로 다룬다. 이름으로 찾아 있으면 재사용하고 없으면 생성한다.
- **이동 먼저, 등록 나중**: 최악의 실패 상태가 "파일은 분류됐는데 일정이 누락된 것"이 되도록 순서를 잡는다. 이 상태는 통보로 복구할 수 있다.
- **통보에 링크를 붙인다**: 처리 결과를 텔레그램으로 알리되 파일·폴더 링크를 함께 보내, 오독 수정이나 일정 보완을 바로 할 수 있게 한다.
- **사실로 분기한다**: 공판기일통지서·공소장·반성문 세 종류를 같은 스크립트로 돌렸는데, 출석 일시 유무·당사자 수라는 사실에 따라 알아서 다른 경로를 탔다.
- **토큰은 코드 밖에**: 텔레그램 토큰은 스크립트에 박지 않고 `~/.config/court-pipeline/telegram.env`에서 읽어, 스크립트를 공유해도 토큰이 따라 나가지 않게 했다. 완성된 `process_one.sh` 전체는 위에 실어 두었다.

한 파일은 끝까지 돈다. 남은 것은 이것을 SCAN 전체에 대해 돌리는 일과, 그 처리를 언제 시작할지 — 정해진 시각에 자동으로, 그리고 폰에서 즉시 — 정하는 일이다. 다음 화에서 만든다.
