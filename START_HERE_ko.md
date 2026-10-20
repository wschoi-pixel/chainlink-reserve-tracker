# 처음 시작하기 — GitHub Pages 설치

**이 프로젝트는 실행 가능한 소스코드입니다.** GitHub 저장소를 새로 만들 수 있는 권한이 이 대화의 연결 도구에는 없으므로, 아래 한 번의 업로드가 필요합니다. 업로드 후에는 PC를 꺼도 6시간 간격으로 데이터 수집과 대시보드 배포가 실행됩니다.

1. GitHub에서 **Public** 저장소 `chainlink-reserve-tracker`를 만듭니다. README 자동 생성을 해제합니다.
2. 이 폴더에서 PowerShell을 열고 다음을 실행합니다. (Git 사전 설치 필요)

```powershell
git init -b main
git add .
git commit -m "Initial dashboard"
git remote add origin https://github.com/YOUR_GITHUB_ID/chainlink-reserve-tracker.git
git push -u origin main
```

3. 저장소 **Settings → Pages → Build and deployment → Source → GitHub Actions** 선택.
4. **Actions → Update reserve data & deploy → Run workflow** 실행. 테스트·거래기록 복원·배포가 모두 성공한 뒤에 실제 숫자가 보입니다.
5. 접속: `https://YOUR_GITHUB_ID.github.io/chainlink-reserve-tracker/`

**배포 전 로컬에서 디자인만 보기**: `python -m http.server 8000` 실행 후 `http://localhost:8000/?demo=1` 접속. 이는 가상 값으로 만든 **데모 모드**입니다.

API 첫 호출 실패, 가격 데이터 누락, 온체인 검증 실패 가능성이 있어요. 오류가 나면 **Actions → 실패한 실행 → Refresh verified reserve data** 로그를 확인해 주세요. 본 프로젝트는 실제 매입원가가 아니라 **온체인 입금 당시 달러 추정가치**를 계산합니다.

상세 문서: [README.md](README.md)
