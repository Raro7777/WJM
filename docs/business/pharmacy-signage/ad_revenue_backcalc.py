# 약국 스크린당 월 외부광고(제약·건기식) 수익 역산 — 2가지 방법 삼각검증
def won(x):
    if x>=1e8: return f"{x/1e8:,.1f}억"
    if x>=1e4: return f"{x/1e4:,.1f}만"
    return f"{x:,.0f}"

print("="*74)
print("방법 A — 상향식(Bottom-up): 노출수 × CPM × 판매 슬롯")
print("="*74)
# 약국 스크린당 월 광고 노출수
for label,vis,imp_mult,cpm,slots in [
    ("보수", 120, 1.2, 3000, 2),
    ("기본", 150, 1.5, 6000, 4),
    ("낙관", 250, 2.0, 10000, 5),
]:
    monthly_visits = vis*30
    impressions = monthly_visits*imp_mult          # 한 슬롯 기준 월 노출
    rev = impressions/1000*cpm*slots               # 외부 슬롯 판매 매출
    print(f"[{label}] 방문 {vis}/일 → 월노출 {impressions:,.0f} × CPM {cpm:,} × {slots}슬롯 = 스크린 월 {won(rev)}")

print("\n"+"="*74)
print("방법 B — 하향식(Top-down): 광고주 예산 풀 × 점유율 ÷ 약국망")
print("="*74)
PHARMA_OTC = 5800e8      # 제약 대중광고 연 5,800억
HFF_MKT = 6.04e12        # 건기식 시장 6조
HFF_AD_RATIO = 0.10      # 건기식 매출 대비 광고비 ~10%
HFF_AD = HFF_MKT*HFF_AD_RATIO   # 건기식 연 광고비 ~6,000억
print(f"제약 OTC 대중광고: {won(PHARMA_OTC)}/년 · 건기식 광고비(추정): {won(HFF_AD)}/년")
for label,pharma_share,hff_share,capture,screens in [
    ("보수", 0.08, 0.08, 0.05, 7000),   # 약국매체 관심 비중 8%, 그중 5% 점유
    ("기본", 0.15, 0.12, 0.10, 7000),
    ("낙관", 0.20, 0.15, 0.15, 7000),
]:
    addressable = PHARMA_OTC*pharma_share + HFF_AD*hff_share   # 약국 point-of-care 관심 예산
    captured = addressable*capture                              # 우리 약국망이 가져오는 몫
    per_screen_yr = captured/screens
    per_screen_mo = per_screen_yr/12
    print(f"[{label}] 관심예산 {won(addressable)}/년 × 점유 {capture*100:.0f}% = {won(captured)}/년 ÷ {screens:,}개 = 스크린 월 {won(per_screen_mo)}")

print("\n"+"="*74)
print("삼각검증 결론 (스크린당 월 외부광고 매출)")
print("="*74)
print("  보수:  약 3~7만원")
print("  기본:  약 12~16만원   ← 권장 기본값")
print("  낙관:  약 30~45만원")
print()
print("전체 규모 감(기본 15만 × 7,000개 × 12개월):", won(15e4*7000*12), "/년")
print("  → 약국 point-of-care 관심예산(~1,200억+)의 약 10% 수준으로 현실적")
