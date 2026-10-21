'use strict';
const translations = {
  '체인링크 리저브 대시보드':'Chainlink Reserve Dashboard',
  '체인링크 리저브 대시보드 · LINK':'Chainlink Reserve Dashboard · LINK',
  '홈으로':'Home',
  '데이터 연결 중':'Connecting to data',
  'X 게시용 PNG 저장':'Save PNG for X',
  'X 이미지 저장':'Save image for X',
  '리저브로 유입되는 LINK를 온체인에서 추적하고, 유입 당시 달러 가치를 추정합니다.':'Track on-chain LINK inflows to the reserve and estimate their USD value at the time of transfer.',
  '최종 업데이트 확인 중':'Checking last update',
  '주요 지표':'Key metrics',
  '리저브 총 가치':'Reserve value',
  '현재 LINK 가격 적용':'At the current LINK price',
  '리저브 보유량':'Reserve holdings',
  '공식 리저브 컨트랙트 잔액':'Official reserve contract balance',
  'LINK 유통 시가총액':'LINK circulating market cap',
  'CoinGecko · 유통 공급량 기준':'CoinGecko · circulating supply',
  '유통 시총 대비 리저브':'Reserve / market cap',
  '리저브 평가액 ÷ 유통 시가총액':'Reserve value ÷ circulating market cap',
  '리저브 유입 추이':'Reserve inflows',
  '온체인 입금 기준 · 매입 거래 체결금액이 아닌 추정치':'Based on on-chain deposits · estimated value, not actual purchase cost',
  '차트 종류':'Chart type',
  '유입 USD':'USD inflows',
  '유입 LINK':'LINK inflows',
  '누적 LINK':'LINK balance',
  '최근 4주 추정 유입':'Estimated inflows · last 4 weeks',
  '직전 4주 추정 유입':'Estimated inflows · prior 4 weeks',
  '변화율':'Change',
  '리저브 입금 추이 차트':'Reserve inflow chart',
  '첫 수집이 완료되면 차트가 표시됩니다.':'The chart will appear after the first successful data collection.',
  '입금 시점 USD 추정액':'Estimated USD at deposit',
  '표시 기간':'Time range',
  '12주':'12 weeks',
  '26주':'26 weeks',
  '전체':'All',
  '최근 유입 기록':'Latest inflow',
  '가장 최근 리저브 입금 트랜잭션':'The most recent reserve deposit transaction',
  '기록 시각 (UTC)':'Timestamp (UTC)',
  '입금 시점 LINK/USD':'LINK/USD at deposit',
  '전송 방향':'Direction',
  '원본 거래':'Transaction',
  '리저브 유입 ≠ 거래소 매수. 달러 값은 온체인 입금 시각의 참조가격으로 계산됩니다.':'Reserve inflows ≠ exchange purchases. USD values use reference prices at the time of the on-chain deposit.',
  '리저브 입출금 장부':'Reserve transfer ledger',
  '2025년 8월부터 기록 · 거래 해시로 중복 제거':'History from August 2025, including July 31 funding · deduplicated by transaction hash',
  '보기':'Show',
  '전체 거래':'All transfers',
  '입금만':'Deposits only',
  '출금만':'Withdrawals only',
  '날짜 · UTC':'Date · UTC',
  '구분':'Type',
  '유입 / 유출 LINK':'LINK in / out',
  '당시 USD 추정액':'Estimated USD at transfer',
  '거래 확인':'Transaction',
  '온체인 내역 수집 대기 중':'Waiting for on-chain history',
  '이전':'Previous',
  '다음':'Next',
  '데이터의 의미와 한계':'Methodology and limitations',
  '온체인 수량':'On-chain amounts',
  '은 체인링크가 공식 게시한 이더리움 리저브 주소의 ERC-20 LINK 전송 기록과 잔액입니다.':'are ERC-20 LINK transfers and balances for the Ethereum reserve address published by Chainlink.',
  '입금 당시 USD':'USD at deposit',
  '는 DefiLlama의 당시 시장가격을 곱한 추정 평가액이며, 실제 매수금액·체결가·신규 매출과 다를 수 있습니다.':'is an estimate based on historical DefiLlama market prices. It may differ from actual purchase costs, execution prices or new revenue.',
  '현재 평가액·시총 비율':'Current valuation and market cap ratio',
  '은 CoinGecko 시세·시총을 사용합니다. 조회 지연과 가격 데이터 누락이 있을 수 있습니다. 이 사이트는 체인링크 재단의 공식 서비스가 아닙니다.':'use CoinGecko prices and market cap. Data may be delayed or prices unavailable. This is an independent community dashboard, not an official Chainlink service.',
  '공식 대시보드 ↗':'Official dashboard ↗',
  '온체인 컨트랙트 ↗':'On-chain contract ↗',
  '입금 당시 달러 추정액':'Estimated USD at deposit',
  '주간 LINK 유입 수량':'Weekly LINK inflows',
  '누적 리저브 LINK 잔액':'Cumulative reserve LINK balance',
  '해당하는 거래가 없습니다.':'No matching transfers.',
  '수집':'Updated',
  '데모 데이터 · 실제 아님':'Demo data · not live',
  '미리보기용 가상 데이터입니다. 실제 리저브 수치는 사용하지 않았습니다. 실제 데이터는 GitHub Actions 첫 수집 후 확인하세요.':'This preview uses fictional data. Live reserve data will appear after the first successful GitHub Actions run.',
  '업데이트 지연':'Update delayed',
  '데이터 수집이 24시간 이상 지연되었습니다. GitHub Actions 실행 상태를 확인하세요. 마지막으로 성공한 데이터만 표시합니다.':'Data collection is more than 24 hours behind. Check GitHub Actions. Only the last successful snapshot is shown.',
  '시장 데이터 불완전':'Market data incomplete',
  '현재 LINK 시세 또는 유통 시가총액을 조회하지 못했습니다. 해당 지표는 — 로 표시하며, 수집된 온체인 데이터는 유지합니다.':'The current LINK price or circulating market cap is unavailable. Missing metrics appear as —; collected on-chain data is retained.',
  '시세 갱신 지연':'Market prices delayed',
  '시장가격 및 시가총액이 24시간 이상 오래된 스냅샷입니다. 시가총액 대비 비율을 최신 값으로 간주하지 마세요.':'Market prices and market cap are more than 24 hours old. The reserve share of market cap should not be treated as current.',
  '온체인 데이터 동기화됨':'On-chain data synced',
  '일부 과거 입금의 시점별 USD 가격을 확보하지 못했습니다. 해당 칸은 — 로 표시합니다.':'Historical USD prices are unavailable for some deposits. Those values appear as —.',
  '첫 수집 필요':'Awaiting verified data',
  '아직 검증된 실제 데이터가 없습니다. GitHub 저장소 Actions → Update reserve data & deploy → Run workflow를 실행하세요. 샘플 미리보기는 주소 끝에 ?demo=1을 붙여 볼 수 있습니다.':'Verified live data is not yet available. In the GitHub repository, select Actions → Update reserve data & deploy → Run workflow. Add ?demo=1 to preview sample data.',
  'Chainlink Reserve Tracker — 공식 이더리움 온체인 입금내역과 USD 환산, 누적 보유량, 유통 시가총액 대비 비율':'Chainlink Reserve Dashboard — Ethereum on-chain deposits, estimated USD values, reserve holdings and share of circulating market cap',
  '온체인 리저브 입금 추이와 LINK 가치 포착을 추적합니다.':'Track on-chain reserve inflows and LINK reserve value.'
};
let language = 'ko';
try { language = localStorage.getItem('reserve-language') === 'en' ? 'en' : 'ko'; } catch {}
const requestedLanguage = new URLSearchParams(location.search).get('lang');
if (['ko','en'].includes(requestedLanguage)) language = requestedLanguage;
function tr(text) { return language === 'en' ? (translations[text] ?? text) : text; }
// Retain the original text nodes, so changing language preserves nested markup.
const translatedNodes = [];
const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
while (walker.nextNode()) {
  const node = walker.currentNode;
  if (!node.parentElement.closest('script,style') && translations[node.textContent.trim()]) {
    translatedNodes.push({node, original:node.textContent});
  }
}
const translatedAttributes = [];
document.querySelectorAll('[aria-label],meta[content]').forEach(node => {
  for (const attribute of ['aria-label','content']) {
    const original = node.getAttribute(attribute);
    if (translations[original]) translatedAttributes.push({node, attribute, original});
  }
});
function applyLanguage() {
  document.documentElement.lang = language;
  for (const {node,original} of translatedNodes) {
    node.textContent = original.replace(original.trim(), tr(original.trim()));
  }
  for (const {node,attribute,original} of translatedAttributes) node.setAttribute(attribute,tr(original));
  document.title = tr('체인링크 리저브 대시보드 · LINK');
  const button = document.getElementById('language-btn');
  button.textContent = language === 'ko' ? 'English' : '한국어';
  button.setAttribute('aria-label',language === 'ko' ? 'Switch to English' : '한국어로 전환');
}
document.getElementById('language-btn').addEventListener('click', () => {
  language = language === 'ko' ? 'en' : 'ko';
  try { localStorage.setItem('reserve-language',language); } catch {}
  const url = new URL(location.href);
  url.searchParams.set('lang',language);
  history.replaceState(null,'',url);
  applyLanguage();
  document.dispatchEvent(new Event('languagechange'));
});
applyLanguage();
