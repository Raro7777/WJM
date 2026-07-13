"""
약국 사이니지 - 수익성 모델 v3 (2단 로켓)
1단(기반): 자체 인터넷 가입 성과광고 — 인입 3만원 / 접수(설치)전화 15만원
2단(상방): 약국망 규모 도달 후 외부 광고 유치 + 구글/네이버 프로그래매틱 DOOH
방법론: creating-financial-models. 단위: 원(KRW)
"""
import numpy as np
DISCOUNT_RATE=0.15
LEAD_PRICE=30_000     # 인터넷 가입 인입(DB)당
CALL_PRICE=150_000    # 인터넷 가입 접수(설치)전화당

def scenario(name):
    return {
        "capex_per_screen":{"worst":1_400_000,"base":1_000_000,"best":750_000}[name],
        "opex_per_screen_mo":{"worst":35_000,"base":25_000,"best":18_000}[name],
        # 1단: 인터넷가입 성과 (성숙 월 발생)
        "leads_per_screen_mo":{"worst":3.0,"base":7.0,"best":14.0}[name],
        "calls_per_screen_mo":{"worst":0.6,"base":1.5,"best":3.5}[name],
        # 2단: 외부/프로그매틱 DOOH 성숙 월매출/스크린 (규모도달 후)
        "ext_rev_per_screen_mo":{"worst":40_000,"base":100_000,"best":200_000}[name],
        # 2단 램프: 1~2년 0(자체집중), 3년부터 광고주 확보 램프
        "ext_ramp":[0,0,0.30,0.60,0.85],
        "pharmacy_share":{"worst":0.25,"base":0.20,"best":0.15}[name],
        "installed_base":{"worst":[200,600,1400,2600,4000],
            "base":[300,1000,2500,4500,7000],"best":[500,1800,4000,7000,11000]}[name],
        "resp_ramp":{"worst":[0.45,0.65,0.80,0.90,0.95],
            "base":[0.55,0.75,0.90,1.00,1.00],"best":[0.65,0.85,1.00,1.00,1.00]}[name],
        "sga":{"worst":[600_000_000,900_000_000,1_300_000_000,1_700_000_000,2_100_000_000],
            "base":[500_000_000,750_000_000,1_050_000_000,1_400_000_000,1_750_000_000],
            "best":[400_000_000,650_000_000,900_000_000,1_150_000_000,1_450_000_000]}[name],
    }

def self_rev_mo(A): return A["leads_per_screen_mo"]*LEAD_PRICE+A["calls_per_screen_mo"]*CALL_PRICE

def run(A,years=5):
    inst=A["installed_base"];prev=[0]+inst[:-1];added=[inst[i]-prev[i] for i in range(years)]
    srmax=self_rev_mo(A);rows=[];cum=0;fcfs=[]
    for y in range(years):
        avg=(prev[y]+inst[y])/2
        self_g=avg*srmax*12*A["resp_ramp"][y]
        ext_g=avg*A["ext_rev_per_screen_mo"]*12*A["ext_ramp"][y]
        gross=self_g+ext_g
        payout=gross*A["pharmacy_share"];net=gross-payout
        opex=avg*A["opex_per_screen_mo"]*12
        ebitda=net-opex-A["sga"][y]
        capex=added[y]*A["capex_per_screen"]
        fcf=ebitda-capex;cum+=fcf;fcfs.append(fcf)
        rows.append(dict(year=y+1,installed=inst[y],avg=avg,self_g=self_g,ext_g=ext_g,
            gross=gross,payout=payout,opex=opex,ebitda=ebitda,capex=capex,fcf=fcf,cum=cum))
    npv=sum(fcfs[i]/(1+DISCOUNT_RATE)**(i+1) for i in range(years))
    return rows,npv

def kpis(name):
    A=scenario(name);rows,npv=run(A);y5=rows[-1]
    peak=-min(r["cum"] for r in rows)
    return dict(name=name,rows=rows,npv=npv,y5_rev=y5["gross"],y5_self=y5["self_g"],
        y5_ext=y5["ext_g"],y5_ebitda=y5["ebitda"],y5_inst=y5["installed"],
        total_capex=sum(r["capex"] for r in rows),peak=peak)

def won(x):
    if abs(x)>=1e8:return f"{x/1e8:,.1f}억"
    if abs(x)>=1e4:return f"{x/1e4:,.0f}만"
    return f"{x:,.0f}"

if __name__=="__main__":
    print("="*94)
    print("약국 사이니지 — 2단 로켓 모델 v3  (1단:인터넷가입 성과 / 2단:외부·프로그매틱 DOOH)")
    print("="*94)
    R={n:kpis(n) for n in ["worst","base","best"]}
    print(f"\n{'지표':<26}{'비관':>18}{'기본':>18}{'낙관':>18}")
    print("-"*94)
    def line(l,k,f):print(f"{l:<26}"+"".join(f(R[s][k]).rjust(18) for s in ['worst','base','best']))
    line("5년차 설치 약국 수","y5_inst",lambda x:f"{x:,.0f}개")
    line("5년차 총매출","y5_rev",won)
    line("  ├ 1단 인터넷가입","y5_self",won)
    line("  └ 2단 외부DOOH","y5_ext",won)
    line("5년차 EBITDA","y5_ebitda",won)
    line("필요 투자금","peak",won)
    line("5년 NPV(15%)","npv",won)

    # 순수 자체광고(v2)와의 비교: 2단 기여
    print("\n"+"="*94);print("2단(외부DOOH) 상방 기여도");print("="*94)
    from model_v2 import kpis as k2
    for n in ["worst","base","best"]:
        v2=k2(n)["npv"];v3=R[n]["npv"]
        print(f"  {n:<6}: 1단만 NPV {won(v2):>9}  →  1+2단 NPV {won(v3):>9}   (+{won(v3-v2)} 상방)")

    print("\n"+"="*94);print("[기본] 연도별 손익 (매출 2단 분해)");print("="*94)
    print(f"{'연차':<5}{'설치':>9}{'1단매출':>12}{'2단매출':>11}{'총매출':>12}{'EBITDA':>12}{'누적현금':>12}")
    print("-"*94)
    for r in R["base"]["rows"]:
        print(f"{r['year']:<5}{r['installed']:>8,}개{won(r['self_g']):>12}{won(r['ext_g']):>11}"
              f"{won(r['gross']):>12}{won(r['ebitda']):>12}{won(r['cum']):>12}")
