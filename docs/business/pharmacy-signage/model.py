"""
약국 디지털 사이니지 광고매체 사업 - 수익성 모델
Unit-economics + 5년 롤아웃 프로젝트 파이낸스 모델

방법론: creating-financial-models 스킬 (시나리오 3종 + 민감도 + 손익분기 + NPV/IRR)
가정 출처: deep-research 결과 + 타깃 웹조사 (설치비/DOOH 시장/규제)
모든 금액 단위: 원(KRW)
"""
import numpy as np

# ------------------------------------------------------------------
# 시장 상수 (조사 확증)
TOTAL_PHARMACIES = 25199          # 2024.10 HIRA 기준 (확증 high)
DISCOUNT_RATE = 0.15              # 초기 벤처 할인율

# ------------------------------------------------------------------
# 시나리오별 가정
# 핵심 불확실 변수: 스크린당 월 광고매출(성숙 시), 광고판매 채움율(fill) 램프
def scenario_assumptions(name):
    A = {
        # 스크린당 설치 자본비용 (디스플레이+미디어플레이어+설치), 1회성
        # 조사: 상업용 43~55인치 + 설치, 한국 기준
        "capex_per_screen": {"worst": 1_400_000, "base": 1_000_000, "best": 750_000}[name],
        # 스크린당 월 운영비 (통신+콘텐츠+유지보수+전기)
        "opex_per_screen_mo": {"worst": 35_000, "base": 25_000, "best": 18_000}[name],
        # 성숙 시(100% 채움) 스크린당 월 광고 총매출 (건기식/비의약품 중심)
        "max_rev_per_screen_mo": {"worst": 70_000, "base": 120_000, "best": 190_000}[name],
        # 약국주 수익 배분율 (호스팅 유치 인센티브)
        "pharmacy_share": {"worst": 0.30, "base": 0.20, "best": 0.15}[name],
        # 5년 설치 누적 대수 (연말 기준)
        "installed_base": {
            "worst": [200, 600, 1400, 2600, 4000],
            "base":  [300, 1000, 2500, 4500, 7000],
            "best":  [500, 1800, 4000, 7000, 11000],
        }[name],
        # 광고 채움율(판매 성숙도) 연차 램프
        "fill_ramp": {
            "worst": [0.10, 0.22, 0.35, 0.45, 0.55],
            "base":  [0.15, 0.35, 0.55, 0.70, 0.80],
            "best":  [0.25, 0.50, 0.70, 0.82, 0.90],
        }[name],
        # 연간 고정 본사비 (영업팀/기획/관리) - 광고 매체영업 인건비 중심
        "sga": {
            "worst": [700_000_000, 1_100_000_000, 1_600_000_000, 2_100_000_000, 2_600_000_000],
            "base":  [600_000_000, 900_000_000, 1_300_000_000, 1_700_000_000, 2_100_000_000],
            "best":  [500_000_000, 800_000_000, 1_100_000_000, 1_400_000_000, 1_700_000_000],
        }[name],
    }
    return A


def run_model(A, years=5):
    inst = A["installed_base"]
    prev_inst = [0] + inst[:-1]
    added = [inst[i] - prev_inst[i] for i in range(years)]  # 연간 신규 설치

    rows = []
    for y in range(years):
        # 매출: 연중 설치가 진행되므로 평균 가동 대수 = (기초+기말)/2
        avg_screens = (prev_inst[y] + inst[y]) / 2
        fill = A["fill_ramp"][y]
        gross_rev = avg_screens * A["max_rev_per_screen_mo"] * 12 * fill
        pharmacy_payout = gross_rev * A["pharmacy_share"]
        net_media_rev = gross_rev - pharmacy_payout
        screen_opex = avg_screens * A["opex_per_screen_mo"] * 12
        gross_profit = net_media_rev - screen_opex
        sga = A["sga"][y]
        ebitda = gross_profit - sga
        capex = added[y] * A["capex_per_screen"]
        fcf = ebitda - capex   # 세전 단순 FCF (감가상각 무시, 현금흐름 기준)
        rows.append({
            "year": y + 1,
            "installed_eoy": inst[y],
            "added": added[y],
            "avg_screens": avg_screens,
            "fill": fill,
            "gross_rev": gross_rev,
            "pharmacy_payout": pharmacy_payout,
            "net_media_rev": net_media_rev,
            "screen_opex": screen_opex,
            "gross_profit": gross_profit,
            "sga": sga,
            "ebitda": ebitda,
            "capex": capex,
            "fcf": fcf,
        })

    # 누적 현금흐름 / NPV / IRR
    cum = 0
    fcfs = []
    for r in rows:
        cum += r["fcf"]
        r["cum_fcf"] = cum
        fcfs.append(r["fcf"])
    npv = sum(fcfs[i] / (1 + DISCOUNT_RATE) ** (i + 1) for i in range(years))

    # IRR (초기 투자 없음, 현금흐름 시퀀스 자체) - 근사
    def irr(cashflows):
        # cashflows[0]는 연말1 FCF... 초기(t0) 투자 필요하므로 t0=0 가정 후 연말 흐름
        try:
            roots = np.roots([cashflows[i] for i in range(len(cashflows)-1, -1, -1)])
            real = [r.real for r in roots if abs(r.imag) < 1e-6 and r.real > 0]
            rates = [1/x - 1 for x in real if x != 0]
            valid = [r for r in rates if -0.99 < r < 5]
            return max(valid) if valid else None
        except Exception:
            return None

    return rows, npv


def scenario_kpis(name):
    A = scenario_assumptions(name)
    rows, npv = run_model(A)
    y5 = rows[-1]
    total_capex = sum(r["capex"] for r in rows)
    peak_funding = -min(r["cum_fcf"] for r in rows)  # 최대 누적 적자 = 필요 투자금
    # 손익분기 스크린 수 (성숙 유닛 이코노믹스 기준): 스크린 1대 기여이익 vs 배분된 본사비
    A_mature_rev = A["max_rev_per_screen_mo"] * A["fill_ramp"][-1]
    unit_contrib_mo = A_mature_rev * (1 - A["pharmacy_share"]) - A["opex_per_screen_mo"]
    unit_contrib_yr = unit_contrib_mo * 12
    y5_sga = A["sga"][-1]
    be_screens = y5_sga / unit_contrib_yr if unit_contrib_yr > 0 else float('inf')
    # 유닛 페이백 (성숙 기준, 본사비 제외 순수 스크린 회수)
    unit_payback_yr = A["capex_per_screen"] / unit_contrib_yr if unit_contrib_yr > 0 else float('inf')
    return {
        "name": name, "rows": rows, "npv": npv,
        "y5_rev": y5["gross_rev"], "y5_ebitda": y5["ebitda"],
        "y5_installed": y5["installed_eoy"], "total_capex": total_capex,
        "peak_funding": peak_funding,
        "unit_contrib_mo": unit_contrib_mo, "be_screens": be_screens,
        "unit_payback_yr": unit_payback_yr,
    }


def won(x):
    if abs(x) >= 1e8:
        return f"{x/1e8:,.1f}억"
    if abs(x) >= 1e4:
        return f"{x/1e4:,.0f}만"
    return f"{x:,.0f}"


if __name__ == "__main__":
    print("=" * 90)
    print("약국 디지털 사이니지 광고매체 사업 — 5년 수익성 모델 (시나리오 분석)")
    print("=" * 90)

    results = {}
    for name in ["worst", "base", "best"]:
        results[name] = scenario_kpis(name)

    # 시나리오 요약
    print(f"\n{'지표':<28}{'비관(worst)':>18}{'기본(base)':>18}{'낙관(best)':>18}")
    print("-" * 90)
    def line(label, key, fmt):
        vals = [fmt(results[s][key]) for s in ["worst", "base", "best"]]
        print(f"{label:<28}{vals[0]:>18}{vals[1]:>18}{vals[2]:>18}")
    line("5년차 설치 약국 수", "y5_installed", lambda x: f"{x:,.0f}개")
    line("5년차 광고 총매출", "y5_rev", won)
    line("5년차 EBITDA", "y5_ebitda", won)
    line("5년 누적 설비투자(capex)", "total_capex", won)
    line("필요 투자금(최대 누적적자)", "peak_funding", won)
    line("5년 NPV(15% 할인)", "npv", won)
    line("스크린당 월 기여이익", "unit_contrib_mo", won)
    line("손익분기 약국 수(성숙기준)", "be_screens", lambda x: f"{x:,.0f}개")
    line("스크린 투자회수기간", "unit_payback_yr", lambda x: f"{x:.1f}년")

    # base 시나리오 연도별 상세
    print("\n" + "=" * 90)
    print("[기본 시나리오] 연도별 손익 상세")
    print("=" * 90)
    print(f"{'연차':<6}{'설치대수':>10}{'채움율':>8}{'광고매출':>12}{'약국배분':>12}{'스크린운영비':>12}{'본사비':>10}{'EBITDA':>12}{'누적현금':>12}")
    print("-" * 90)
    for r in results["base"]["rows"]:
        print(f"{r['year']:<6}{r['installed_eoy']:>9,}개{r['fill']*100:>7.0f}%"
              f"{won(r['gross_rev']):>12}{won(r['pharmacy_payout']):>12}"
              f"{won(r['screen_opex']):>12}{won(r['sga']):>10}"
              f"{won(r['ebitda']):>12}{won(r['cum_fcf']):>12}")
