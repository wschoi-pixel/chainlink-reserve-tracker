# Chainlink Reserve Tracker

**온체인 입금 내역 + 당시 달러 추정 가치 + LINK 유통 시가총액 대비 리저브 비율**을 표시하는 무료 GitHub Pages 사이트입니다. 한국어 UI, 모바일 지원, 2025-08 출범부터 과거 거래 복원, 주간 그래프, CSV 다운로드, X용 1600×900 PNG 저장을 포함합니다.

> **중요:** `입금 당시 USD 추정액 = 입금된 LINK × 입금 시각 근처 시장가격`입니다. 실제 거래소 매수금액, 매수 체결가, 신규 매출, 은행 수수료를 뜻하지 않습니다. 출금도 입금과 구분하여 저장합니다. Chainlink 공식 서비스가 아닙니다.

## 1. 내 GitHub Pages에 배포 (10분)

1. [GitHub의 새 저장소 만들기](https://github.com/new)를 엽니다. 이름은 **`chainlink-reserve-tracker`**, 공개 범위 **Public**, README 초기화 **체크 해제**로 생성합니다.
2. 이 프로젝트 ZIP을 PC에서 압축 해제한 후, 그 폴더에서 Windows 터미널/PowerShell을 실행합니다. [Git](https://git-scm.com/downloads)이 없으면 설치하세요.
3. 아래 명령에서 **`YOUR_GITHUB_ID`**만 본인의 GitHub ID로 교체하고 순서대로 실행합니다.

   ```powershell
   git init -b main
   git add .
   git commit -m "Initial Chainlink Reserve Tracker"
   git remote add origin https://github.com/YOUR_GITHUB_ID/chainlink-reserve-tracker.git
   git push -u origin main
   ```

4. 저장소 → **Settings → Pages → Build and deployment → Source: GitHub Actions**로 변경합니다.
5. **Actions → Update reserve data & deploy → Run workflow**를 실행합니다. 테스트 → 데이터 수집 → JSON 기록 → Pages 배포가 이어집니다. GitHub가 배포한 주소는 `https://YOUR_GITHUB_ID.github.io/chainlink-reserve-tracker/` 형태입니다.
6. 이후 **6시간마다 자동 갱신**합니다. Actions 스케줄은 혼잡 시 지연되거나 비활성화될 수 있으므로 사이트 상단의 마지막 수집 시각을 확인하세요.

> 첫 실행이 실패했다면 Actions 실행 로그를 확인해 API 오류나 리저브 잔액 검증 오류를 먼저 해결하세요. 데이터가 없을 때는 임의 수치를 표시하지 않습니다. 저장소 정책에 따라 **Settings → Actions → General → Workflow permissions**에서 쓰기 권한 허용이 필요할 수 있습니다.

## 2. 실행 방법

- 로컬 화면 확인: 프로젝트 루트에서 `python -m http.server 8000` → `http://localhost:8000/`
- 검증 테스트: `python -m unittest discover -s tests -v`
- 실제 온체인 데이터 수집: `python scripts/update_data.py` → `data/latest.json`
- 미리보기 전용 가상 데이터: `http://localhost:8000/?demo=1` (**DEMO** 고정 표시, 실거래 아님)
- 사이트 오른쪽 **X 이미지 저장**: PNG 1600×900 내보내기
- **CSV**: 날짜·입금/출금·LINK 수량·당시 USD 추정액·거래 해시

## 3. 데이터 출처와 계산식

| 출처 | 데이터 | 주의할 점 |
|---|---|---|
| [Chainlink 공식 리저브 발표](https://chain.link/blog/chainlink-reserve-strategic-link-reserve) | 공식 지갑 주소 확정 | 해당 게시물의 Etherscan 링크와 대조 |
| [이더리움 리저브 주소](https://etherscan.io/address/0x9A709B7B69EA42D5eeb1ceBC48674C69E1569eC6) / [Blockscout REST](https://docs.blockscout.com/devs/apis/rest) | 모든 ERC-20 LINK 입출금 / 현재 LINK 잔액 | 입출금 로그 전체를 페이지네이션하여 수집하고 잔액과 합산 수량 대조 |
| [DefiLlama Coins API](https://api-docs.defillama.com/) | 과거 시점 LINK/USD | 실제 체결가가 아닌 시장가격에 따른 추정치. 누락 시 `—` 표시 |
| [CoinGecko API](https://docs.coingecko.com/reference/coins-markets) | 현재 가격, 시가총액, 유통량 | 무료 API 사용 제한 가능. 실패하면 이전 스냅샷과 지연 안내 |

- `현재 리저브 USD = 실제 온체인 LINK 잔액 × 현재 LINK/USD`
- `유통 시총 대비 비율(%) = 현재 리저브 USD ÷ LINK 유통 시가총액 × 100`
- `입금 당시 USD 추정액 = 각 입금 LINK 수량 × 해당 거래 시점 근처 LINK/USD 시장가격`
- `누적 LINK = 해당 지갑으로 들어온 LINK - 해당 지갑에서 나간 LINK`
- 잔액 검증에는 공식 출범 전인 2025-07-31의 1 LINK 입금도 포함하여 지갑의 전체 기록을 사용합니다.
- 동일 트랜잭션에서 복수의 ERC-20 이벤트가 나오면 거래표에는 합산합니다. 이벤트 고유키는 `tx_hash:log_index`입니다.
- 전체 전송 기록 합계와 최신 온체인 잔액이 0.001 LINK 넘게 불일치하면 JSON 업데이트를 거절하여 불완전한 기록이 표시되지 않도록 합니다.

## 4. 폴더 구성

```text
index.html                 정적 대시보드
assets/app.js              그래프·거래표·PNG·CSV 기능
assets/styles.css          반응형 다크 UI
scripts/update_data.py     온체인·시세·과거 가격 수집 (Python 표준 라이브러리)
tests/test_update_data.py  오프라인 모의 API 테스트
.github/workflows/         자동 수집 + GitHub Pages 배포
data/demo.json             **샘플 데이터 (실제 기록 아님)**
data/latest.json           첫 자동 수집 시 생성되는 검증된 실제 데이터
```

## 5. 운영상 한계

- GitHub Pages는 서버리스 정적 호스팅이므로 사이트를 열 때마다 API를 직접 호출하는 대신, Actions가 **6시간마다 계산한 JSON**을 게시합니다. 실시간 틱 데이터가 아닙니다.
- Blockscout 인덱서가 지연되거나 응답 형식을 변경할 경우 수집이 실패할 수 있습니다. 이전에 저장된 검증 데이터를 유지합니다.
- 현재가격/시총 CoinGecko 무료 호출 제한에 걸리면 이전 market 스냅샷을 임시 유지하고 UI에 시세 갱신 지연을 표시합니다.
- 과거 일부 분봉 가격을 못 찾으면 USD 추정액을 비워둡니다. 해당 주의 USD 합계도 비움 처리하여 과소 집계를 방지합니다.
- 유통 시가총액 대비 비율은 유통 공급량과 별개로 API의 market_cap 값을 사용합니다. 유통량 비율도 참고로 JSON에 보관합니다.
- Chainlink Reserve의 자금 이동이 LINK 시장 매수와 1:1로 일치하는지, 자금의 매출 귀속 시점은 온체인 입금만으로 알 수 없습니다.

## License

MIT · 개인/커뮤니티 리서치용. 제3자 데이터의 이용약관을 지키세요.
