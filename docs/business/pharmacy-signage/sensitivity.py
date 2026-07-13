"""민감도(토네이도) + 2-way 표: base 시나리오 기준 5년 NPV 영향도"""
import numpy as np
from pharmacy_signage_model import scenario_assumptions, run_model, DISCOUNT_RATE, won

BASE = scenario_assumptions("base")

def npv_with(overrides):
    A = {k: (v.copy() if isinstance(v, list) else v) for k, v in BASE.items()}
    A.update(overrides)
    _, npv = run_model(A)
    return npv

base_npv = npv_with({})
print("기본 NPV:", won(base_npv))

# 토네이도: 각 변수 ±30% (또는 합리적 범위) 변화 시 NPV
print("\n" + "="*70)
print("토네이도 분석 — 각 변수 변동 시 5년 NPV 영향 (기본 대비)")
print("="*70)

drivers = []

# 1. 스크린당 성숙매출 ±30%
for lo, hi in [(0.7, 1.3)]:
    n_lo = npv_with({"max_rev_per_screen_mo": BASE["max_rev_per_screen_mo"]*lo})
    n_hi = npv_with({"max_rev_per_screen_mo": BASE["max_rev_per_screen_mo"]*hi})
    drivers.append(("스크린당 월 광고매출 ±30%", n_lo, n_hi))

# 2. 채움율 ±25%p 스케일
n_lo = npv_with({"fill_ramp": [x*0.75 for x in BASE["fill_ramp"]]})
n_hi = npv_with({"fill_ramp": [min(x*1.25,0.95) for x in BASE["fill_ramp"]]})
drivers.append(("광고 채움율 ±25%", n_lo, n_hi))

# 3. 약국 배분율 15%~30%
n_lo = npv_with({"pharmacy_share": 0.30})
n_hi = npv_with({"pharmacy_share": 0.15})
drivers.append(("약국 배분율 30%↔15%", n_lo, n_hi))

# 4. capex ±30%
n_lo = npv_with({"capex_per_screen": BASE["capex_per_screen"]*1.3})
n_hi = npv_with({"capex_per_screen": BASE["capex_per_screen"]*0.7})
drivers.append(("스크린 설치비 ±30%", n_lo, n_hi))

# 5. 스크린 운영비 ±30%
n_lo = npv_with({"opex_per_screen_mo": BASE["opex_per_screen_mo"]*1.3})
n_hi = npv_with({"opex_per_screen_mo": BASE["opex_per_screen_mo"]*0.7})
drivers.append(("스크린 월 운영비 ±30%", n_lo, n_hi))

# 6. 설치 속도(롤아웃) ±30%
n_lo = npv_with({"installed_base": [int(x*0.7) for x in BASE["installed_base"]]})
n_hi = npv_with({"installed_base": [int(x*1.3) for x in BASE["installed_base"]]})
drivers.append(("설치 전개속도 ±30%", n_lo, n_hi))

# 7. 본사비 ±20%
n_lo = npv_with({"sga": [x*1.2 for x in BASE["sga"]]})
n_hi = npv_with({"sga": [x*0.8 for x in BASE["sga"]]})
drivers.append(("본사 고정비 ±20%", n_lo, n_hi))

# 영향폭 기준 정렬
drivers.sort(key=lambda d: abs(d[2]-d[1]), reverse=True)
print(f"\n{'변수':<26}{'하방 NPV':>14}{'상방 NPV':>14}{'영향폭':>14}")
print("-"*70)
for name, lo, hi in drivers:
    swing = abs(hi-lo)
    print(f"{name:<26}{won(lo):>14}{won(hi):>14}{won(swing):>14}")

# 2-way 표: 스크린당 월매출 × 채움율(5년차) → NPV
print("\n" + "="*70)
print("2-way 표: 성숙 스크린당 월광고매출 × 채움율스케일 → 5년 NPV")
print("="*70)
rev_range = [80_000, 100_000, 120_000, 150_000, 180_000]
fill_scales = [0.6, 0.8, 1.0, 1.2]
header = "월매출\\채움  " + "".join(f"{int(f*100)}%".rjust(12) for f in fill_scales)
print(header)
for rev in rev_range:
    row = f"{won(rev):<10}"
    for fs in fill_scales:
        npv = npv_with({
            "max_rev_per_screen_mo": rev,
            "fill_ramp": [min(x*fs,0.95) for x in BASE["fill_ramp"]],
        })
        row += won(npv).rjust(12)
    print(row)

# 손익분기: base 구조에서 NPV=0 되는 스크린당 월매출 찾기
print("\n" + "="*70)
print("손익분기 탐색: NPV=0 되는 '성숙 스크린당 월광고매출' (기본 채움율)")
print("="*70)
lo, hi = 50_000, 300_000
for _ in range(40):
    mid = (lo+hi)/2
    if npv_with({"max_rev_per_screen_mo": mid}) < 0:
        lo = mid
    else:
        hi = mid
print(f"NPV 손익분기 스크린당 월광고매출 ≈ {won((lo+hi)/2)}원  (기본가정 12만원 대비)")
