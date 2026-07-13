"""
약국 사이니지 - 모델 v4
1단: 인입 3만 + 접수전화 전환당 회사마진 10만 (총액15만 중 순마진10만)
2단: 외부/프로그래매틱 DOOH (규모 도달 후, 3년차부터)
약국 배분: 'flat'=월 5만원/스크린 정액  또는  'pct'=수익의 30%
방법론: creating-financial-models. 단위 KRW
"""
DISCOUNT_RATE=0.15
LEAD_PRICE=30_000
CONV_MARGIN=100_000   # 접수전화 전환당 회사 순마진

def scenario(name):
    return {
        "capex_per_screen":{"worst":1_400_000,"base":1_000_000,"best":750_000}[name],
        "opex_per_screen_mo":{"worst":35_000,"base":25_000,"best":18_000}[name],
        "leads_per_screen_mo":{"worst":3.0,"base":7.0,"best":14.0}[name],
        "conv_per_screen_mo":{"worst":0.6,"base":1.5,"best":3.5}[name],
        "ext_rev_per_screen_mo":{"worst":40_000,"base":100_000,"best":200_000}[name],
        "ext_ramp":[0,0,0.30,0.60,0.85],
        "installed_base":{"worst":[200,600,1400,2600,4000],
            "base":[300,1000,2500,4500,7000],"best":[500,1800,4000,7000,11000]}[name],
        "resp_ramp":{"worst":[0.45,0.65,0.80,0.90,0.95],
            "base":[0.55,0.75,0.90,1.00,1.00],"best":[0.65,0.85,1.00,1.00,1.00]}[name],
        "sga":{"worst":[600_000_000,900_000_000,1_300_000_000,1_700_000_000,2_100_000_000],
            "base":[500_000_000,750_000_000,1_050_000_000,1_400_000_000,1_750_000_000],
            "best":[400_000_000,650_000_000,900_000_000,1_150_000_000,1_450_000_000]}[name],
    }

FLAT_PER_SCREEN_MO=50_000  # 정액 배분
PCT_SHARE=0.30             # 정률 배분

def self_rev_mo(A): return A["leads_per_screen_mo"]*LEAD_PRICE+A["conv_per_screen_mo"]*CONV_MARGIN

def run(A,comp,years=5):
    inst=A["installed_base"];prev=[0]+inst[:-1];added=[inst[i]-prev[i] for i in range(years)]
    srmax=self_rev_mo(A);rows=[];cum=0;fcfs=[]
    for y in range(years):
        avg=(prev[y]+inst[y])/2
        self_g=avg*srmax*12*A["resp_ramp"][y]
        ext_g=avg*A["ext_rev_per_screen_mo"]*12*A["ext_ramp"][y]
        gross=self_g+ext_g
        payout=(avg*FLAT_PER_SCREEN_MO*12) if comp=="flat" else gross*PCT_SHARE
        net=gross-payout
        opex=avg*A["opex_per_screen_mo"]*12
        ebitda=net-opex-A["sga"][y]
        capex=added[y]*A["capex_per_screen"]
        fcf=ebitda-capex;cum+=fcf;fcfs.append(fcf)
        rows.append(dict(year=y+1,installed=inst[y],avg=avg,self_g=self_g,ext_g=ext_g,
            gross=gross,payout=payout,opex=opex,ebitda=ebitda,capex=capex,fcf=fcf,cum=cum))
    npv=sum(fcfs[i]/(1+DISCOUNT_RATE)**(i+1) for i in range(years))
    return rows,npv

def kpis(name,comp):
    A=scenario(name);rows,npv=run(A,comp);y5=rows[-1]
    peak=-min(r["cum"] for r in rows)
    # 성숙 스크린당 월 기여이익 & 회수기간
    rmax=self_rev_mo(A)
    payout_mo=FLAT_PER_SCREEN_MO if comp=="flat" else rmax*PCT_SHARE
    contrib=rmax-payout_mo-A["opex_per_screen_mo"]
    payback=A["capex_per_screen"]/(contrib*12) if contrib>0 else float('inf')
    return dict(name=name,comp=comp,rows=rows,npv=npv,y5_rev=y5["gross"],y5_self=y5["self_g"],
        y5_ext=y5["ext_g"],y5_ebitda=y5["ebitda"],y5_inst=y5["installed"],peak=peak,
        total_capex=sum(r["capex"] for r in rows),contrib_mo=contrib,payback=payback,
        pharmacy_mo=payout_mo)

def won(x):
    if x==float('inf'):return '불가'
    if abs(x)>=1e8:return f'{x/1e8:,.1f}억'
    if abs(x)>=1e4:return f'{x/1e4:,.0f}만'
    return f'{x:,.0f}'

if __name__=="__main__":
    for comp,label in [("flat","약국 월 5만원 정액"),("pct","수익의 30%")]:
        print("="*90);print(f"[배분방식: {label}]  (인입3만 + 접수전화 전환마진10만)");print("="*90)
        R={n:kpis(n,comp) for n in ["worst","base","best"]}
        print(f"{'지표':<24}{'비관':>18}{'기본':>18}{'낙관':>18}")
        print("-"*90)
        def line(l,k,f):print(f"{l:<24}"+"".join(f(R[s][k]).rjust(18) for s in ['worst','base','best']))
        print(f"{'스크린 월매출(1단성숙)':<24}"+"".join(won(self_rev_mo(scenario(s))).rjust(18) for s in ['worst','base','best']))
        line("약국 월수익/스크린","pharmacy_mo",won)
        line("5년차 총매출","y5_rev",won)
        line("5년차 EBITDA","y5_ebitda",won)
        line("필요 투자금","peak",won)
        line("5년 NPV(15%)","npv",won)
        line("스크린 월 기여이익","contrib_mo",won)
        line("스크린 회수기간","payback",lambda x:f"{x:.2f}년" if x!=float('inf') else '불가')
        print()
