"""
약국 사이니지 사업 - 수익성 모델 v2 (자체 성과광고 모델)
운영사 = 온라인 성과광고 회사. 스크린을 자체 리드생성 채널로 사용.
수익 = 인입(리드) 3만원 + 접수전화 15만원 (사용자 제시 단가)
핵심 변화: 외부 매체판매 아님 → 채움율 리스크 제거(100% 자체광고), 리드가치 전액 회수.
방법론: creating-financial-models (시나리오·민감도·손익분기). 단위: 원(KRW)
"""
import numpy as np

DISCOUNT_RATE = 0.15
LEAD_PRICE = 30_000     # 인입(리드)당
CALL_PRICE = 150_000    # 접수전화당

def scenario(name):
    A = {
        "capex_per_screen": {"worst":1_400_000,"base":1_000_000,"best":750_000}[name],
        "opex_per_screen_mo": {"worst":35_000,"base":25_000,"best":18_000}[name],
        # 성숙 시 스크린당 월 발생량
        "leads_per_screen_mo": {"worst":3.0,"base":7.0,"best":14.0}[name],
        "calls_per_screen_mo": {"worst":0.6,"base":1.5,"best":3.5}[name],
        "pharmacy_share": {"worst":0.25,"base":0.20,"best":0.15}[name],
        "installed_base": {
            "worst":[200,600,1400,2600,4000],
            "base": [300,1000,2500,4500,7000],
            "best": [500,1800,4000,7000,11000],
        }[name],
        # 성과 최적화 램프(자체광고라 첫날부터 노출, 전환율만 성숙)
        "resp_ramp": {
            "worst":[0.45,0.65,0.80,0.90,0.95],
            "base": [0.55,0.75,0.90,1.00,1.00],
            "best": [0.65,0.85,1.00,1.00,1.00],
        }[name],
        # 본사비: 매체영업 불필요(자체광고), 대신 설치/운영/약국BD/리드기술
        "sga": {
            "worst":[600_000_000,900_000_000,1_300_000_000,1_700_000_000,2_100_000_000],
            "base": [500_000_000,750_000_000,1_050_000_000,1_400_000_000,1_750_000_000],
            "best": [400_000_000,650_000_000,900_000_000,1_150_000_000,1_450_000_000],
        }[name],
    }
    return A

def rev_per_screen_mo_mature(A):
    return A["leads_per_screen_mo"]*LEAD_PRICE + A["calls_per_screen_mo"]*CALL_PRICE

def run(A, years=5):
    inst=A["installed_base"]; prev=[0]+inst[:-1]
    added=[inst[i]-prev[i] for i in range(years)]
    rmax=rev_per_screen_mo_mature(A)
    rows=[]; cum=0; fcfs=[]
    for y in range(years):
        avg=(prev[y]+inst[y])/2
        resp=A["resp_ramp"][y]
        gross=avg*rmax*12*resp
        payout=gross*A["pharmacy_share"]
        net=gross-payout
        opex=avg*A["opex_per_screen_mo"]*12
        gp=net-opex
        sga=A["sga"][y]
        ebitda=gp-sga
        capex=added[y]*A["capex_per_screen"]
        fcf=ebitda-capex
        cum+=fcf; fcfs.append(fcf)
        rows.append(dict(year=y+1,installed=inst[y],avg=avg,resp=resp,gross=gross,
                         payout=payout,opex=opex,ebitda=ebitda,capex=capex,fcf=fcf,cum=cum))
    npv=sum(fcfs[i]/(1+DISCOUNT_RATE)**(i+1) for i in range(years))
    return rows,npv

def kpis(name):
    A=scenario(name); rows,npv=run(A); y5=rows[-1]
    rmax=rev_per_screen_mo_mature(A)
    unit_contrib=rmax*(1-A["pharmacy_share"])-A["opex_per_screen_mo"]  # 월/스크린
    unit_payback=A["capex_per_screen"]/(unit_contrib*12) if unit_contrib>0 else float('inf')
    be_screens=A["sga"][-1]/(unit_contrib*12) if unit_contrib>0 else float('inf')
    peak=-min(r["cum"] for r in rows)
    return dict(name=name,rows=rows,npv=npv,rmax=rmax,y5_rev=y5["gross"],
                y5_ebitda=y5["ebitda"],y5_inst=y5["installed"],
                total_capex=sum(r["capex"] for r in rows),peak=peak,
                unit_contrib=unit_contrib,unit_payback=unit_payback,be_screens=be_screens)

def won(x):
    if abs(x)>=1e8: return f"{x/1e8:,.1f}억"
    if abs(x)>=1e4: return f"{x/1e4:,.0f}만"
    return f"{x:,.0f}"

if __name__=="__main__":
    print("="*92)
    print("약국 사이니지 — 자체 성과광고 모델 v2  (인입 3만원 / 접수전화 15만원)")
    print("="*92)
    R={n:kpis(n) for n in ["worst","base","best"]}

    print(f"\n{'지표':<28}{'비관':>18}{'기본':>18}{'낙관':>18}")
    print("-"*92)
    def line(lbl,key,fmt):
        print(f"{lbl:<28}"+"".join(fmt(R[s][key]).rjust(18) for s in ['worst','base','best']))
    line("성숙 스크린당 월매출","rmax",won)
    line("5년차 설치 약국 수","y5_inst",lambda x:f"{x:,.0f}개")
    line("5년차 광고 총매출","y5_rev",won)
    line("5년차 EBITDA","y5_ebitda",won)
    line("5년 누적 설비투자","total_capex",won)
    line("필요 투자금(최대누적적자)","peak",won)
    line("5년 NPV(15%)","npv",won)
    line("스크린당 월 기여이익","unit_contrib",won)
    line("스크린 투자회수기간","unit_payback",lambda x:f"{x:.2f}년")
    line("손익분기 약국수(성숙)","be_screens",lambda x:f"{x:,.0f}개")

    print("\n"+"="*92)
    print("[기본] 연도별 손익 (단위 억원 표기)")
    print("="*92)
    print(f"{'연차':<5}{'설치':>9}{'전환성숙':>9}{'광고매출':>12}{'약국배분':>12}{'운영비':>11}{'EBITDA':>12}{'누적현금':>12}")
    print("-"*92)
    for r in R["base"]["rows"]:
        print(f"{r['year']:<5}{r['installed']:>8,}개{r['resp']*100:>7.0f}%"
              f"{won(r['gross']):>12}{won(r['payout']):>12}{won(r['opex']):>11}"
              f"{won(r['ebitda']):>12}{won(r['cum']):>12}")

    # 약국에게 돌아가는 월 수익(유치 매력도)
    print("\n[약국 유치 매력도] 성숙기 약국 1곳이 받는 월 수익 (배분율 적용):")
    for n in ["worst","base","best"]:
        A=scenario(n); pm=rev_per_screen_mo_mature(A)*A["pharmacy_share"]
        print(f"  {n:<6}: 약국 월수익 {won(pm)}원  (스크린 월매출 {won(A['leads_per_screen_mo']*LEAD_PRICE+A['calls_per_screen_mo']*CALL_PRICE)})")
