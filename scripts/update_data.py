#!/usr/bin/env python3
"""Collect official Chainlink Reserve ERC-20 transfers + estimated USD values.

Sources:
  - Officially linked Ethereum reserve wallet, fetched from Blockscout REST v2
  - DeFiLlama Coin Prices batch historical API
  - CoinGecko free public /coins/markets endpoint for USD price / circulating market cap

This script never fabricates purchases or prices. A transfer's USD estimate is the
market value at transfer time, *not* the execution price or demonstrated spending.
"""
from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import json
import os
from pathlib import Path
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

RESERVE = '0x9A709B7B69EA42D5eeb1ceBC48674C69E1569eC6'
LINK = '0x514910771AF9Ca656af840dff83E8264EcF986CA'
COIN = 'ethereum:' + LINK.lower()
BLOCKSCOUT_BASE = os.getenv('BLOCKSCOUT_BASE', 'https://eth.blockscout.com/api/v2').rstrip('/')
LLAMA_BASE = os.getenv('LLAMA_BASE', 'https://coins.llama.fi').rstrip('/')
COINGECKO_BASE = os.getenv('COINGECKO_BASE', 'https://api.coingecko.com/api/v3').rstrip('/')
DATA_FILE = Path(__file__).resolve().parents[1] / 'data' / 'latest.json'
DATE_BEGIN = datetime(2025, 8, 1, tzinfo=timezone.utc)
MAX_PAGES = 120


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def rounded(value: Decimal | float | int, places: int = 6) -> float:
    return round(float(value), places)


class HttpClient:
    def get(self, url: str) -> Any:
        req = Request(url, headers={'Accept': 'application/json', 'User-Agent': 'chainlink-reserve-tracker/1.0 (GitHub Pages research dashboard)'})
        for attempt in range(5):
            try:
                with urlopen(req, timeout=35) as r:
                    return json.load(r)
            except (HTTPError, URLError, TimeoutError, ValueError) as exc:
                retry = not isinstance(exc, HTTPError) or exc.code in (408, 429, 500, 502, 503, 504)
                if not retry or attempt == 4:
                    raise RuntimeError(f'API request failed: {url.split("?")[0]} ({exc})') from exc
                time.sleep(min(2 ** attempt, 12))
        raise AssertionError('unreachable')


def address_of(value: Any) -> str:
    if isinstance(value, dict):
        return (value.get('hash') or '').lower()
    return str(value or '').lower()


def parse_transfer(item: dict) -> dict | None:
    token = item.get('token') or {}
    if address_of(token.get('address') or token.get('address_hash')) != LINK.lower():
        return None
    sender, recipient = address_of(item.get('from')), address_of(item.get('to'))
    if (sender == RESERVE.lower()) == (recipient == RESERVE.lower()):
        return None
    if item.get('log_index') is None:
        raise ValueError('Blockscout transfer missing log_index; refusing unstable IDs')
    try:
        raw_value = (item.get('total') or {}).get('value')
        decimals = int(token.get('decimals') or (item.get('total') or {}).get('decimals') or 18)
        if decimals != 18:
            raise ValueError('unexpected LINK token decimals')
        amount = Decimal(str(raw_value)) / Decimal(10) ** decimals
        timestamp = item['timestamp']
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).astimezone(timezone.utc)
        if not (DATE_BEGIN <= dt <= datetime.now(timezone.utc)):
            return None
        txhash = str(item.get('tx_hash') or item.get('transaction_hash') or '').lower()
        if not txhash.startswith('0x') or len(txhash) != 66:
            raise ValueError('invalid transaction hash')
        if amount <= 0:
            return None
        direction = 'in' if recipient == RESERVE.lower() else 'out'
        return {
            'id': f'{txhash}:{int(item["log_index"])}',
            'tx_hash': txhash, 'log_index': int(item['log_index']),
            'timestamp': dt.isoformat(timespec='seconds').replace('+00:00', 'Z'),
            'direction': direction, 'link': rounded(amount, 9),
            'usd_price_at_transfer': None, 'usd_estimate': None,
        }
    except (KeyError, TypeError, ValueError, InvalidOperation) as exc:
        raise ValueError(f'bad LINK transfer data: {exc}') from exc


def fetch_all_transfers(client: HttpClient, max_pages: int = MAX_PAGES) -> list[dict]:
    url = f'{BLOCKSCOUT_BASE}/addresses/{RESERVE}/token-transfers'
    params: dict[str, Any] = {'type': 'ERC-20', 'token': LINK}
    events: dict[str, dict] = {}
    seen_pages: set[str] = set()
    for page in range(max_pages):
        full_url = url + '?' + urlencode(params)
        if full_url in seen_pages:
            raise ValueError('Blockscout pagination repeated; avoiding partial dataset')
        seen_pages.add(full_url)
        data = client.get(full_url)
        if not isinstance(data, dict) or not isinstance(data.get('items'), list):
            raise ValueError('Invalid Blockscout transfer response')
        for item in data['items']:
            event = parse_transfer(item)
            if event:
                events[event['id']] = event
        nxt = data.get('next_page_params')
        if not nxt:
            break
        params = {'type': 'ERC-20', 'token': LINK, **nxt}
        time.sleep(0.16)
    else:
        raise RuntimeError(f'History exceeds {max_pages} Blockscout pages: refusing incomplete backfill')
    if not events:
        raise RuntimeError('No on-chain LINK transfer records; check explorer/indexer before publishing')
    return sorted(events.values(), key=lambda e: (e['timestamp'], e['tx_hash'], e['log_index']))


def fetch_onchain_balance(client: HttpClient) -> Decimal:
    url = f'{BLOCKSCOUT_BASE}/addresses/{RESERVE}/token-balances'
    data = client.get(url)
    if not isinstance(data, list):
        raise ValueError('Invalid Blockscout balance payload')
    for item in data:
        token = item.get('token') or {}
        if address_of(token.get('address') or token.get('address_hash')) == LINK.lower():
            d = int(token.get('decimals') or 18)
            if d != 18:
                raise ValueError('Bad LINK decimals on current balance')
            return Decimal(str(item['value'])) / Decimal(10) ** d
    raise RuntimeError('LINK balance not found in verified wallet; cannot reconcile')


def fetch_historical_prices(client: HttpClient, events: list[dict], prior: dict | None = None) -> None:
    prior_by_id = {e['id']: e for e in (prior or {}).get('events', []) if isinstance(e, dict) and e.get('id')}
    wanted = []
    for e in events:
        previous = prior_by_id.get(e['id'])
        if previous and isinstance(previous.get('usd_price_at_transfer'), (float, int)) and previous['usd_price_at_transfer'] > 0:
            price = Decimal(str(previous['usd_price_at_transfer']))
            e['usd_price_at_transfer'] = rounded(price, 6)
            e['usd_estimate'] = rounded(Decimal(str(e['link'])) * price, 2)
        else:
            wanted.append(e)
    unique_seconds = sorted({int(datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00')).timestamp()) for e in wanted})
    prices: dict[int, float] = {}
    for offset in range(0, len(unique_seconds), 65):
        chunk = unique_seconds[offset:offset + 65]
        query = urlencode({'coins': json.dumps({COIN: chunk}, separators=(',', ':'))})
        try:
            payload = client.get(f'{LLAMA_BASE}/batchHistorical?{query}')
            item = (payload.get('coins') or {}).get(COIN) or {}
            entries = item.get('prices') or []
            for record in entries:
                ts, p = record.get('timestamp'), record.get('price')
                if ts is None or p is None:
                    continue
                nearest = min(chunk, key=lambda v: abs(v - int(ts)))
                if abs(nearest - int(ts)) <= 7200 and float(p) > 0:
                    prices[nearest] = float(p)
        except (RuntimeError, KeyError, TypeError, ValueError) as exc:
            print(f'WARNING: batch historical price fetch unavailable: {exc}')
        time.sleep(0.1)
    for e in wanted:
        ts = int(datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00')).timestamp())
        if ts in prices:
            price = Decimal(str(prices[ts]))
            e['usd_price_at_transfer'] = rounded(price)
            e['usd_estimate'] = rounded(Decimal(str(e['link'])) * price, 2)


def fetch_market(client: HttpClient, prior: dict | None = None) -> dict:
    url = f'{COINGECKO_BASE}/coins/markets?' + urlencode({'vs_currency': 'usd', 'ids': 'chainlink'})
    try:
        data = client.get(url)
        coin = next(c for c in data if c.get('id') == 'chainlink')
        price, cap, supply = coin.get('current_price'), coin.get('market_cap'), coin.get('circulating_supply')
        if not all(x is not None and float(x) > 0 for x in (price, cap, supply)):
            raise ValueError('CoinGecko returned incomplete or zero market data')
        return {'link_usd': float(price), 'market_cap_usd': float(cap), 'circulating_supply_link': float(supply), 'source': 'CoinGecko', 'quoted_at': utcnow()}
    except (RuntimeError, TypeError, ValueError, StopIteration) as exc:
        print(f'WARNING: CoinGecko market snapshot unavailable: {exc}')
        old = (prior or {}).get('market')
        if old and old.get('market_cap_usd') and old.get('link_usd') and old.get('quoted_at'):
            return old
        try:
            payload = client.get(f'{LLAMA_BASE}/prices/current/{COIN}')
            price = ((payload.get('coins') or {}).get(COIN) or {}).get('price')
            if price and float(price) > 0:
                return {'link_usd': float(price), 'market_cap_usd': None, 'circulating_supply_link': None, 'source': 'DefiLlama (no market cap)', 'quoted_at': utcnow()}
        except (RuntimeError, ValueError, TypeError):
            pass
        return {'link_usd': None, 'market_cap_usd': None, 'circulating_supply_link': None, 'source': 'unavailable', 'quoted_at': None}


def group_transactions(events: list[dict]) -> list[dict]:
    by_tx: dict[str, list[dict]] = defaultdict(list)
    for e in events:
        by_tx[e['tx_hash']].append(e)
    grouped = []
    for tx, items in by_tx.items():
        net_link = sum((Decimal(str(e['link'])) * (1 if e['direction'] == 'in' else -1) for e in items), Decimal(0))
        has_all = all(e.get('usd_estimate') is not None for e in items)
        usd = sum(Decimal(str(e['usd_estimate'])) * (1 if e['direction'] == 'in' else -1) for e in items) if has_all else None
        if net_link == 0:
            continue
        grouped.append({'tx_hash': tx, 'timestamp': items[0]['timestamp'], 'direction': 'in' if net_link > 0 else 'out',
                        'link': rounded(abs(net_link), 9), 'usd_estimate': rounded(abs(usd), 2) if usd is not None else None,
                        'entry_count': len(items)})
    return sorted(grouped, key=lambda e: (e['timestamp'], e['tx_hash']))


def assemble(events: list[dict], balance: Decimal, market: dict, time_str: str | None = None) -> dict:
    running = Decimal(0)
    daily: dict[str, dict] = {}
    for event in events:
        signed = Decimal(str(event['link'])) * (1 if event['direction'] == 'in' else -1)
        running += signed
        date = event['timestamp'][:10]
        bucket = daily.setdefault(date, {'date': date, 'link_in': Decimal(0), 'link_out': Decimal(0), 'usd_in': Decimal(0), 'usd_missing': False, 'balance_link': Decimal(0)})
        if signed > 0:
            bucket['link_in'] += signed
            if event.get('usd_estimate') is None:
                bucket['usd_missing'] = True
            else:
                bucket['usd_in'] += Decimal(str(event['usd_estimate']))
        else:
            bucket['link_out'] += -signed
        bucket['balance_link'] = running
    series = [{'date': v['date'], 'link_in': rounded(v['link_in'], 6), 'link_out': rounded(v['link_out'], 6),
               'usd_in_estimate': None if v['usd_missing'] else rounded(v['usd_in'], 2),
               'balance_link': rounded(v['balance_link'], 6)} for v in sorted(daily.values(), key=lambda x: x['date'])]
    diff = abs(running - balance)
    txs = group_transactions(events)
    missing = sum(e['direction'] == 'in' and e.get('usd_estimate') is None for e in events)
    last_deposit = next((t for t in reversed(txs) if t['direction'] == 'in'), None)
    return {'schema_version': 1, 'updated_at': time_str or utcnow(),
            'reserve_address': RESERVE, 'link_token_address': LINK,
            'market': market,
            'reserve': {'balance_link': rounded(balance, 9), 'net_transfer_link': rounded(running, 9),
                        'reconciled': diff < Decimal('0.001'), 'reconciliation_difference_link': rounded(diff, 9),
                        'usd_value': rounded(balance * Decimal(str(market['link_usd'])), 2) if market.get('link_usd') else None,
                        'market_cap_share_pct': rounded(balance * Decimal(str(market['link_usd'])) / Decimal(str(market['market_cap_usd'])) * 100, 4) if market.get('link_usd') and market.get('market_cap_usd') else None,
                        'supply_share_pct': rounded(balance / Decimal(str(market['circulating_supply_link'])) * 100, 4) if market.get('circulating_supply_link') else None},
            'history': {'start': DATE_BEGIN.date().isoformat(), 'event_count': len(events), 'tx_count': len(txs),
                        'unpriced_inflow_events': missing, 'complete': True},
            'last_deposit': last_deposit, 'events': events, 'transactions': txs, 'daily': series}


def run(client: HttpClient, prior: dict | None = None, now: str | None = None) -> dict:
    events = fetch_all_transfers(client)
    balance = fetch_onchain_balance(client)
    market = fetch_market(client, prior)
    fetch_historical_prices(client, events, prior)
    doc = assemble(events, balance, market, now)
    if not doc['reserve']['reconciled']:
        raise RuntimeError(f'On-chain balance mismatch: transfers={doc["reserve"]["net_transfer_link"]} balance={doc["reserve"]["balance_link"]}. Refusing incomplete history.')
    return doc


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=DATA_FILE)
    args = parser.parse_args()
    old = json.loads(args.output.read_text(encoding='utf-8')) if args.output.exists() else None
    doc = run(HttpClient(), prior=old)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    tmp = args.output.with_suffix('.tmp')
    tmp.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    tmp.replace(args.output)
    print(f'OK | balance={doc["reserve"]["balance_link"]:,.2f} LINK | txs={doc["history"]["tx_count"]} | price misses={doc["history"]["unpriced_inflow_events"]} | market={doc["market"]["source"]}')


if __name__ == '__main__':
    main()
