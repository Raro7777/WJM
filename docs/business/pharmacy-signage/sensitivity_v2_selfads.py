"""v2 민감도: 성과광고 모델. 기본 대비 5년 NPV. + 손익분기 리드수 + 타당성 체크"""
from model_v2 import scenario, run, won, LEAD_PRICE, CALL_PRICE, rev_per_screen_mo_mature
BASE=scenario("base")

def npv_with(ov):
    A={k:(v.copy() if isinstance(v,list) else v) for k,v in BASE.items()}; A.update(ov)
    return run(A)[1]

base_npv=npv_with({}); print("기본 NPV:",won(base_npv))

print("\n"+"="*72); print("토네이도 — 각 변수 변동 시 5년 NPV (기본 +169억)"); print("="*72)
drivers=[]
drivers.append(("스크린당 리드수 ±30%",npv_with({"leads_per_screen_mo":BASE["leads_per_screen_mo"]*0.7}),npv_with({"leads_per_screen_mo":BASE["leads_per_screen_mo"]*1.3})))
drivers.append(("스크린당 전화수 ±30%",npv_with({"calls_per_screen_mo":BASE["calls_per_screen_mo"]*0.7}),npv_with({"calls_per_screen_mo":BASE["calls_per_screen_mo"]*1.3})))
drivers.append(("전환 성숙속도 ±20%",npv_with({"resp_ramp":[x*0.8 for x in BASE["resp_ramp"]]}),npv_with({"resp_ramp":[min(x*1.2,1) for x in BASE["resp_ramp"]]})))
drivers.append(("설치 전개속도 ±30%",npv_with({"installed_base":[int(x*0.7) for x in BASE["installed_base"]]}),npv_with({"installed_base":[int(x*1.3) for x in BASE["installed_base"]]})))
drivers.append(("스크린 설치비 ±30%",npv_with({"capex_per_screen":BASE["capex_per_screen"]*1.3}),npv_with({"capex_per_screen":BASE["capex_per_screen"]*0.7})))
drivers.append(("약국 배분율 25%↔15%",npv_with({"pharmacy_share":0.25}),npv_with({"pharmacy_share":0.15})))
drivers.append(("본사 고정비 ±20%",npv_with({"sga":[x*1.2 for x in BASE["sga"]]}),npv_with({"sga":[x*0.8 for x in BASE["sga"]]})))
drivers.sort(key=lambda d:abs(d[2]-d[1]),reverse=True)
print(f"{'변수':<24}{'하방':>14}{'상방':>14}{'영향폭':>14}")
print("-"*72)
for n,lo,hi in drivers: print(f"{n:<24}{won(lo):>14}{won(hi):>14}{won(abs(hi-lo)):>14}")

print("\n"+"="*72); print("2-way: 스크린당 월 리드수 × 전화수 → 5년 NPV (억원)"); print("="*72)
leads=[3,5,7,10,14]; calls=[0.5,1.0,1.5,2.5,3.5]
print("리드\\전화 "+"".join(f"{c}건".rjust(11) for c in calls))
for L in leads:
    row=f"{L}건".ljust(8)
    for C in calls:
        row+=won(npv_with({"leads_per_screen_mo":L,"calls_per_screen_mo":C})).rjust(11)
    print(row)

print("\n"+"="*72); print("손익분기 탐색: NPV=0 되는 성숙 스크린당 월 리드수 (전화 비율 유지)"); print("="*72)
ratio=BASE["calls_per_screen_mo"]/BASE["leads_per_screen_mo"]
lo,hi=0.5,7.0
for _ in range(40):
    mid=(lo+hi)/2
    if npv_with({"leads_per_screen_mo":mid,"calls_per_screen_mo":mid*ratio})<0: lo=mid
    else: hi=mid
be=(lo+hi)/2
print(f"NPV 손익분기 리드수 ≈ {be:.1f}건/월 (+전화 {be*ratio:.1f}건) → 월매출 {won(be*LEAD_PRICE+be*ratio*CALL_PRICE)}  vs 기본 7건")

print("\n"+"="*72); print("타당성 체크: 필요 응답률 (약국 방문객 대비)"); print("="*72)
for visitors in [120,180,250]:
    monthly=visitors*30
    for label,L,C in [("비관",3,0.6),("기본",7,1.5),("낙관",14,3.5)]:
        resp=(L+C)/monthly*100
        print(f"  방문 {visitors}명/일({monthly:,}노출/월) · {label}: 월 {L+C:.1f}건 응답 = 응답률 {resp:.3f}%")
    print()
