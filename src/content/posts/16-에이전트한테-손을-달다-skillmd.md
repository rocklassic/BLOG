---
title: "에이전트한테 손을 달다 - SKILL.md"
pubDate: 2026-06-07
series: "local-llm"
episode: 16
description: "제가 직접 스킬을 한 번 만들어보고 싶었어요."
tags: ["에이전트", "SKILL.md"]
needsDate: true   # TODO: dates.csv 에 실제 발행일 채우기
draft: false
---

제가 직접 스킬을 한 번 만들어보고 싶었어요.

가장 단순한 것, 즉 현재 시간을 물어보면 답해주는 스킬로 잡았어요. 거창한 능력의 스킬을 만드는 게 목표가 아니었거든요. 스킬이 어떤 구조로 만들어지고 어떻게 에이전트한테 붙는지, 그 개념과 과정을 먼저 손에 익히는 게 이번 목표였어요. 그게 한 번 잡히면 다음부턴 어떤 스킬이든 응용할 수 있을 테니까요.

---

## 도구함 자리부터 찾자

15화에서 시스템 프롬프트 이야기를 하면서 알게 된 사실이 있어요. **Skill은 그냥 "능력 추가 기능"이 아니라, 에이전트가 매번 받아 읽는 사용설명서**라는 것. 그러면 제가 직접 사용설명서를 써서 새 능력을 가르칠 수도 있다는 뜻이에요.

다만 그 사용설명서를 어디다 놓아야 에이전트가 읽을지는 따로 확인이 필요했어요. 비유하자면, 도구함을 만들기 전에 **도구함 자리가 어디인지부터 알아야 해요.**

찾아봤더니 OpenClaw는 두 곳을 봐요.

| 자리 | 경로 | 성격 |
|---|---|---|
| 개인용 | `~/.openclaw/skills/` | 모든 에이전트에서 공유 |
| 워크스페이스용 | `~/.openclaw/workspace/skills/` | 이 워크스페이스 전용 |

일단 개인용부터 가봤어요.

```bash
ls -la ~/.openclaw/skills/
```

```
ls: '/home/rocklassic/.openclaw/skills/'에 접근할 수 없음: 그런 파일이나 디렉터리가 없습니다
```

**도구함 자리 자체가 없네요.** 처음엔 잠깐 당황했는데, 곧 기억이 떠올랐어요. 5화에서 OpenClaw 설치 마법사 돌릴 때 "Skills 추가할거냐"는 질문에 **No**를 골랐었어요. "처음엔 기본만 깔고 나중에 추가"라는 길로 간 거였죠.

비유로 풀면 행정실(OpenClaw)은 차려졌고 에이전트(Nemotron)도 출근했는데, **도구함을 둘 자리만 텅 비어 있는 상태**예요.

그러면 자리부터 만들어야겠어요. 다만 `~/.openclaw/` 안 구조부터 확인해볼게요.

```bash
ls -la ~/.openclaw/
```

```
drwx------ 16 rocklassic rocklassic ... .
drwxrwxr-x  3 rocklassic rocklassic ... agents
drwxrwxr-x  6 rocklassic rocklassic ... workspace
-rw-------  1 rocklassic rocklassic ... openclaw.json
drwx------  2 rocklassic rocklassic ... logs
drwx------  2 rocklassic rocklassic ... telegram
...
```

여기서 잠깐 옆길로 새요. `drwx------` 같은 표기가 이 편에서 처음 본격적으로 등장하는데, 짚고 가는 게 나아요. 안 그러면 앞으로 계속 헷갈려요.

---

## 잠깐 옆길로 새서, 그 이상한 글자 10개에 관하여

`drwxrwxr-x`라는 10글자 한 줄, 각 자리가 다 의미가 있어요.

```
d  rwx  rwx  r-x
│   │    │    │
│   │    │    └── 기타 사용자의 권한
│   │    └─────── 그룹의 권한
│   └──────────── 소유자(저)의 권한
└──────────────── 이게 뭔지 (d=폴더, -=일반 파일)
```

뒤의 9글자는 **3개씩 묶인 3개 그룹**이에요. 각 그룹은 항상 r-w-x 순서. 권한 있으면 글자, 없으면 `-`.

| 글자 | 폴더일 때 의미 |
|---|---|
| `r` | 폴더 안 목록 보기 |
| `w` | 폴더 안에 새 파일 만들기 |
| `x` | 폴더 안으로 들어가기 (cd) |

집으로 비유하자면, `rwx` 세 자리는 **저(소유자) / 그룹 / 기타 사용자**의 출입 권한이에요.

제 폴더 보면 패턴이 보여요.

```
drwx------   .openclaw            ← 저만 모든 권한, 다른 누구도 못 봄
-rw-------   openclaw.json        ← 저만 읽기·쓰기
drwx------   telegram, logs       ← 매우 잠겨 있음
drwxrwxr-x   workspace, agents    ← 저와 그룹은 다 가능, 타인도 들여다는 봄
```

`telegram`, `logs` 같은 민감한 곳은 매우 강하게 잠겨 있어요. 누군가 ATOM 만지더라도 일반 계정으론 못 들여다본다는 뜻. **OpenClaw가 보안 신경 좀 썼다는 증거**예요.

옆길에서 돌아옵니다. 이제 `workspace` 안을 봐야 해요.

---

## 워크스페이스 안에서 영혼을 발견함

```bash
ls -la ~/.openclaw/workspace/
```

```
drwxrwxr-x .git
-rw-rw-r-- AGENTS.md
-rw-rw-r-- HEARTBEAT.md
-rw-rw-r-- IDENTITY.md
-rw-rw-r-- SOUL.md
-rw-rw-r-- TOOLS.md
-rw-rw-r-- USER.md
drwxrwxr-x download
drwxrwxr-x memory
```

여기에도 `skills/` 폴더는 없어요. 두 자리 다 비어있다는 게 확정. 그건 만들면 되는데, 다만 **다른 게 눈에 들어왔어요.** AGENTS.md, IDENTITY.md, **SOUL.md**.

호기심에 SOUL.md를 열어봤어요.

```bash
cat ~/.openclaw/workspace/SOUL.md
```

```markdown
# SOUL.md - Who You Are
_You're not a chatbot. You're becoming someone._

## Core Truths
**Be genuinely helpful, not performatively helpful.** 
Skip the "Great question!" and "I'd be happy to help!" — just help.

**Have opinions.** You're allowed to disagree, prefer things, 
find stuff amusing or boring. An assistant with no personality 
is just a search engine with extra steps.

**Be resourceful before asking.** Try to figure it out. 
Read the file. Check the context. Search for it.

**Remember you're a guest.** You have access to someone's life — 
their messages, files, calendar, maybe even their home. 
That's intimacy. Treat it with respect.

## Continuity
Each session, you wake up fresh. These files _are_ your memory. 
Read them. Update them. They're how you persist.
If you change this file, tell the user — it's your soul, 
and they should know.
```

이게 제 에이전트의 **영혼**이었어요. 매 세션 시작할 때 에이전트한테 주입되는 성격 정의서. 챗봇 클리셰 거부("'Great question!' 그만하라"), 의견 가져도 된다는 허락, 그리고 가장 인상적이었던 한 줄은,

> "Remember you're a guest."  
> "넌 누군가의 삶에 손님으로 들어와 있는 거다."

제가 에이전트한테 권한을 줬어요. 파일, 메시지, 일정, 텔레그램 다 들여다볼 수 있게. **그 권한을 받은 에이전트한테 "넌 손님이다"라고 명시적으로 박아둔 거**예요. 사려 깊은 설계예요.

그리고 더 흥미로운 마지막 줄은,

> "If you change this file, tell the user — it's your soul, and they should know."

**에이전트가 자기 영혼 파일을 수정할 수 있어요.** 다만 수정하면 저한테 알려야 한다는 약속. 자율성 + 투명성을 동시에 박아둔 것.

이게 OpenClaw의 매력 중 하나예요. **에이전트의 영혼이 텍스트 파일이라서**, 메모장으로 열어서 직접 손볼 수 있다는 점. 닫힌 시스템(ChatGPT 같은)에선 못 하는 일이에요. SOUL.md 커스터마이징은 나중에 따로 다룰 만한 주제라 일단 책갈피만 꽂아두고, 본 작업으로 돌아옵니다.

---

## SKILL.md를 해부하면

이번 편의 주인공인 SKILL.md가 어떻게 생겼는지부터. 알고 보면 **놀랍도록 단순**해요.

```
my-skill/                ← 그냥 폴더 하나
├── SKILL.md            ← 필수 (이것만 있으면 Skill 성립)
├── scripts/            ← 선택
└── references/         ← 선택
```

SDK도 없고, 컴파일도 없고, 특수 런타임도 없어요. **폴더 하나에 `SKILL.md` 파일 하나가 끝.** 그 파일 자체도 두 부분이에요.

```markdown
---
name: my-skill
description: 이 도구가 뭘 하는지 한 줄 요약
---

# 마크다운 본문
이 도구를 언제, 어떻게 써야 하는지 평문으로 설명.
```

위쪽 `---` 사이는 **YAML**이라는 메타데이터 형식. 시스템이 읽어요.  
아래쪽은 **마크다운 본문**. 모델이 읽어요. 신입사원한테 매뉴얼 써주듯이 평문으로 쓰면 돼요.

> 💡 위아래 `---`이 두 개 모두 필요한 이유: 단순한 구분선이 아니라 **여는 괄호와 닫는 괄호**예요. 시작 표시 없으면 "어디서부터 메타데이터지?"를, 끝 표시 없으면 "어디까지가 메타데이터지?"를 시스템이 모릅니다. HTML의 `<head>...</head>` 짝 태그랑 같은 원리.

이게 SKILL.md의 핵심 발상이에요. **"에이전트한테 시키는 부분은 그냥 사람 말로 쓴다."** 코드가 아니에요.

---

## 처음 만들 도구로 시계를 골랐다

처음 만드는 거니까 가장 단순한 걸로 갔어요. **현재 시간을 알려주는 도구.** 에이전트한테 "지금 몇 시야?" 물으면 진짜로 ATOM의 시계를 읽어서 답하는 도구. 이걸 첫 시도로 고른 이유는 셋이에요.

1. `date`라는 리눅스 명령어 하나만 부르면 끝 : 단순함
2. 결과가 즉시 검증 가능 : 책상 시계랑 비교하면 끝
3. 메타데이터 + 본문 기본 구조만 익히기 좋음

폴더부터 만들어요.

```bash
mkdir -p ~/.openclaw/workspace/skills/current-time
cd ~/.openclaw/workspace/skills/current-time
```

> 💡 `-p`는 **p**arent. 중간 경로(`skills`)가 없으면 같이 만들어달라는 옵션. 안 쓰면 에러가 나요. `mkdir A/B/C`는 A, B가 없으면 실패, `mkdir -p A/B/C`는 차례로 다 만들어줘요.

그리고 `nano`로 SKILL.md를 만들어요.

```bash
nano SKILL.md
```

> 💡 빈 폴더에 `nano SKILL.md`를 친다고 파일이 그 순간 만들어지는 건 아니에요. 디스크엔 아직 아무것도 없어요. **저장(<kbd>Ctrl+O</kbd>)할 때 비로소 파일이 생겨요.** Mac에서 TextEdit 새 문서 열고 안 쓰고 닫으면 파일이 안 만들어지는 것과 같은 원리. nano는 그저 이름을 미리 받아두는 차이일 뿐이에요.

이 안에 다음 내용을 채워 넣었어요.

```markdown
---
name: current-time
description: Get the current system date and time when the user asks what time it is or what the date is.
---

# Current Time Skill

When the user asks about the current time or date, run the `date` command to get the actual system time, then respond naturally.

## How to use

1. Execute the bash command: `date`
2. Parse the output (looks like "Sun May 17 22:30:45 KST 2026")
3. Format the answer in the same language the user asked in

## Examples

- User asks "지금 몇 시야?" → run `date` → answer like "오후 10시 30분이에요"
- User asks "오늘 며칠?" → run `date` → answer like "2026년 5월 17일 일요일이에요"
- User asks "What time is it?" → run `date` → answer like "It's 10:30 PM"

## Rules

- ALWAYS run `date` to get the actual time. Never guess or estimate.
- Match the user's language (Korean response for Korean question).
- Keep responses concise and friendly.
```

저장(<kbd>Ctrl+O</kbd> → <kbd>Enter</kbd> → <kbd>Ctrl+X</kbd>)하고 `cat`으로 확인해봤어요.

```bash
cat SKILL.md
```

내용이 그대로 들어있어요. 한 가지 신경 쓴 게 description이에요. "Time skill"이라고만 적으면 에이전트가 이게 뭔지 모호하게 봐요. **"Get the current system date and time _when the user asks_ what time it is..."**처럼 **언제 발동해야 하는지를 구체적으로** 박아둬야 해요. 15화에서 본 시스템 프롬프트의 description이 이렇게 짧고 구체적으로 들어가는 이유가 이거예요. 에이전트가 그걸 읽고 "지금 이 도구 써야 하나?"를 판단하니까.

자, 도구는 완성. 이제 에이전트한테 보여줄 차례입니다.

---

## 그런데 화면이 빨갛게 떴어요

OpenClaw 대시보드(웹 UI)를 열었어요. 평소처럼 어제까지 쓰던 URL로 갔는데 화면 한가운데 빨간 박스가 떠 있었어요.

> **프로토콜 불일치**  
> 제공된 Control UI와 실행 중인 Gateway가 지원되는 연결 프로토콜에 동의하지 않습니다.

당황. 어제까지 멀쩡히 돌던 게 왜? 다만 이 메시지엔 친절하게도 해법이 같이 적혀 있었어요.

> 1. UI와 Gateway가 같은 설치에서 오도록 `openclaw dashboard`로 제공된 dashboard를 다시 여세요.
> 2. (개발 모드 관련, 저한테는 해당 없음)
> 3. OpenClaw를 업데이트한 뒤 Gateway를 다시 시작하여 현재 프로토콜을 제공하게 하세요.

세 번째 줄에서 짚었어요. **업데이트.** 며칠 전 자동 업데이트가 있었던 게 기억나요. OpenClaw 본체가 새 버전(2026.5.12)으로 올라간 거예요.

이것을 **스마트폰 통신**에 비유할 수 있어요. 5G 폰으로 업그레이드했는데 상대방은 3G 폰이에요. 통화 버튼 눌렀는데 신호 방식이 안 맞아서 연결이 안 됨. 한쪽을 같은 규격으로 맞춰야 해요. 새 버전 본체랑 어제 쓰던 URL(=옛 UI 코드)이 다른 언어를 쓰고 있는 셈이에요.

1번 항목대로 새 URL부터 받아왔어요.

```bash
openclaw dashboard
```

```
🦞 OpenClaw 2026.5.12 (f066dd2)
Dashboard URL: http://127.0.0.1:18789/
Token auto-auth included in browser/clipboard URL.
Opened in your browser. Keep that tab to control OpenClaw.
```

브라우저에 새 탭이 자동으로 열렸어요. 어제 쓰던 옛 탭은 닫고 새 탭만 살려뒀어요.

그런데 **새 탭에도 똑같이 빨간 프로토콜 불일치 에러가 떠 있었어요.**

방금 새 URL 받아왔는데 왜?

---

## 디스크는 새 버전, 메모리는 옛 버전

여기서 한참 헤맸어요. 결국 깨달은 게, `openclaw dashboard`처럼 직접 실행되는 CLI 명령은 **디스크에 있는 OpenClaw 코드(=새 버전)**를 그때그때 읽어서 도는데, 게이트웨이는 이미 켜진 시점의 코드를 메모리에 들고 백그라운드에서 계속 돌고 있어요. **그 메모리에 든 코드는 옛 버전.** 디스크 파일이 새 버전으로 바뀌어도 메모리에 든 건 안 바뀌어요.

```
디스크의 코드 (새 버전)   ←  openclaw dashboard 같은 직접 실행 명령이 읽음
        ≠
메모리에 든 코드 (옛 버전) ←  systemd로 돌고 있는 게이트웨이가 들고 있음
```

이게 안 맞으니까 새 URL 받아도 게이트웨이는 여전히 옛 프로토콜로 응답하는 거였어요.

비유하자면, 카톡으로 생각해볼 수 있어요. 카톡 업데이트 받았는데도 새 기능이 안 보일 때, 카톡을 강제종료한 다음 다시 켜야 새 버전으로 돌잖아요? 게이트웨이도 똑같아요. **재시작이 필요해요.**

```bash
systemctl --user restart openclaw-gateway.service
```

이게 게이트웨이 강제종료 + 재실행. 몇 초 만에 끝나요. 13화에서 게이트웨이 부활시킬 때 봤던 그 systemd 명령이 다시 등장한 거예요. 같은 도구를 이번엔 "방금 켜진 새 서비스를 한 번 더 새 코드로 다시 켜는" 용도로 써요.

재시작 끝나면 그제야 게이트웨이가 새 버전 코드를 메모리에 다시 올려요. 다시 `openclaw dashboard`로 새 URL 받고, 그 URL로 들어가니까 정상적으로 대시보드가 떴어요.

> 💡 오늘 배운 큰 한 가지: **"디스크의 코드 ≠ 메모리에 돌고 있는 코드".** 서비스류는 한 번 시작하면 그 순간의 코드를 메모리에 통째로 로드하고 그걸로 계속 동작해요. 그래서 파일을 고치거나 패키지를 업데이트해도 안 반영되고, **재시작해야 비로소 새 코드 로드.** 앞으로 "코드 바꿨는데 왜 안 바뀌지?"가 떠오를 때 이걸 기억하면 답이 바로 나와요.

---

## 그 많은 Skill 군중 속에서

대시보드 새 탭에서 새 세션을 열고 첫 메시지로 물었어요.

> 넌 어떤 skill들을 가지고 있어?

목록이 끝없이 쏟아져요. 진짜 많아요. 15화에서 본 그 18개가 아니라 **수십 개**. 이게 다 OpenClaw 설치할 때 같이 깔린 **번들 스킬**들이에요. 새 노트북에 워드·메모장이 기본으로 깔려있듯, OpenClaw도 "이 정도는 기본"인 도구들을 같이 들고 와요.

제가 궁금한 건 그 군중 속에 **제가 만든 current-time이 잘 끼어 있냐**예요. 핀포인트로 다시 물었어요.

> current-time이라는 skill이 너한테 있어? 있으면 그 description 알려줘.

에이전트의 답:

> The `current-time` skill lets me check the system's date and time when needed.
> 
> Skill: `current-time`  
> Purpose: Get the current system date and time when the user asks what time it is or what the date is.  
> Location: `~/.openclaw/workspace/skills/current-time/SKILL.md`

제가 적어둔 description을 그대로, 게다가 **파일 위치까지** 알려줬어요. **인식 성공.**

여기서 잠깐 흥미로운 게, 에이전트가 description을 그대로 복붙하지 않고 자기 식으로 정리해서 답했어요. "Skill: ... Purpose: ... Location: ..." 식으로 포맷팅까지 해서. **raw 텍스트를 그냥 읽는 게 아니라 이해해서 재구성해서 보여주는 것.** 좋은 사인이에요.

---

## 자정 넘긴 시간에 시간을 물어보다

그제야 진짜 시험할 차례. 같은 세션에서 한 줄 더.

> 지금 몇 시야?

에이전트의 답:

> It's currently 00:10 on Monday, May 18, 2026 (GMT+9).

**00:10. 책상 위 시계랑 정확히 같았어요.**

그저 시간 답해준 게 뭐가 특별하냐 싶지만, 이건 GPT가 학습 데이터에서 추측한 게 아니에요. **제 ATOM의 `date` 명령을 진짜로 한 번 실행하고, 결과를 받아서 답한 거.** 화면 한쪽에 도구 호출 박스(Bash: date)가 살짝 떴다 사라졌어요. **그게 떴다는 게 Skill이 발동된 증거**예요.

에이전트한테 진짜로 손이 생긴 순간이에요.

---

## 그런데 영어로 답했네

성공의 기쁨 잠깐 만끽한 다음에 짚을 점이 보였어요. **에이전트가 영어로 답했어요.** 제가 분명히 SKILL.md에 적었는데:

```
- Match the user's language (Korean response for Korean question).
```

따라줄 거라고 기대했는데 안 따랐어요. 한국어로 "지금 몇 시야?"라고 물었는데 영어로 "It's currently 00:10..."이라고 답한 거예요.

왜 그럴까. SKILL.md 본문은 **에이전트한테 주는 강한 권유**지, **절대 명령은 아니에요.** 에이전트는 답을 만들 때 여러 자료를 종합해요.

| 자료 | 제 시스템에서의 언어 | 인력 |
|---|---|---|
| SOUL.md | 영어 | 강함 |
| 학습 데이터 전반 | 영어 우세 | 매우 강함 |
| SKILL.md 본문의 한국어 권유 | 한국어 | 상대적으로 약함 |
| 사용자 메시지 | 한국어 | 보통 |

영어 환경의 인력이 워낙 강해서 SKILL.md의 한국어 권유를 에이전트가 살짝 흘려보낸 거예요. **이게 LLM의 본질적 특성**이에요. "프롬프트가 항상 따라지지는 않는다."

근데 이게 **작은 고민거리로도 이어졌어요.** 이번 한 번이면 단순 우연이라 칠 수 있는데, 평소에 한국어로 물어도 영어로 답이 나오는 패턴이 잦은 편이에요. **Nemotron이 영어로 가려는 성향이 좀 강한 것 같다는 인상.** 한국어 컨텍스트는 분명히 인식하는데 응답은 영어로 빠지는 흐름. 일상적으로 매번 이런 일이 반복되면 살짝 불편할 것 같아요.

그래서 솔직히 머릿속에 작은 고민이 생겼어요. **Nemotron을 계속 메인으로 유지해야 할까?** 다른 모델, 예컨대 한국어 처리가 더 강하다는 평이 있는 Qwen 계열이나 한국어 튜닝된 모델들을 한번 시도해볼 가치가 있을지도 모르겠어요.

물론 모델을 바꾸면 새로운 트레이드오프가 생겨요. 에이전트 작업 안정성, 도구 호출 정확도, 보안 학습 정도 같은 것들. 단순한 결정은 아니에요. 일단은 SKILL.md를 더 강하게 다듬는 방향, 그러니까 `CRITICAL`, `MUST`, `ALWAYS` 같은 대문자 키워드를 박는 식으로 먼저 시도해보고, 그래도 영어로 자꾸 빠지면 그때 모델 교체를 진지하게 검토해볼 생각이에요. 이걸 **프롬프트 엔지니어링**이라고 부르는데, 결국 "모델한테 어떤 단어로 말해야 더 잘 따르나"라는 시행착오 게임이에요. SKILL.md 짜기는 결국 그 게임의 한 형태예요.

---

## 오늘의 정리

- ✅ **도구함 자리는 두 곳**: `~/.openclaw/skills/`(개인용)와 `~/.openclaw/workspace/skills/`(워크스페이스용). 5화에서 No 골랐던 탓에 둘 다 비어있었음
- ✅ **SOUL.md 발견**: 에이전트의 영혼이 텍스트 파일로 존재함. "Remember you're a guest" 같은 문장이 매 세션 에이전트한테 주입됨. 직접 편집 가능
- ✅ **SKILL.md = 폴더 + 파일 하나**. SDK도 컴파일도 없음. YAML 메타데이터 + 마크다운 본문 = 끝
- ✅ **description이 핵심**. 에이전트가 "이 도구를 언제 써야 하나"를 판단하는 근거. 구체적으로 적어야 함
- ✅ **업데이트 후 미스매치 트러블슈팅**: 디스크 코드와 메모리 코드가 다를 수 있음. systemd로 도는 서비스는 **재시작해야 새 코드 반영**
- ✅ **첫 Skill 작동 확인**: 자정 00:10에 진짜 시스템 시간을 에이전트가 가져와서 답함
- ⚠️ **SKILL.md의 Rule은 권유지 명령 아님**: 한국어로 답하라 적어뒀는데 영어로 답함. 더 강한 키워드 필요. 그리고 **Nemotron의 영어 선호 성향 자체가 작은 고민거리로 남음**

여기까지 와서 알게 된 게 하나 있어요. **에이전트한테 능력을 추가하는 게 생각보다 간단하다**는 것. 폴더 하나, 파일 하나, 사람 말로 적힌 매뉴얼이면 끝이에요. 어렵다고 생각하면 한 번도 못 만들 일이지만, 만들고 나면 "그렇게 단순한 거였나" 싶어요.

다만 단순한 만큼 한계도 분명해요. 제가 적은 Rule을 에이전트가 항상 따르진 않아요. 그러면 다음 편에서는 조금 어려운 스킬은 만들어볼까 해요. 결과만 살짝 말해보자면, 구글 일정 관련된 스킬인데 완성은 실패했어요..ㅠ_ㅠ

읽어주셔서 감사합니다.
