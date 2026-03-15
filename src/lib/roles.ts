// ── 역할 체계 ──
// super_admin    최고관리자   모든 권한
// site_admin     사이트관리자 모든 권한
// dept_manager   부서담당     부서 권한
// dept_sub_manager 부서부담당 부서 권한
// partner        협력점       업무요청 가능

export const ROLES = ['super_admin', 'site_admin', 'dept_manager', 'dept_sub_manager', 'partner'] as const
export type Role = typeof ROLES[number]

export const ROLE_LABELS: Record<string, string> = {
  super_admin: '최고관리자',
  site_admin: '사이트관리자',
  dept_manager: '부서담당',
  dept_sub_manager: '부서부담당',
  partner: '협력점',
}

export const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  site_admin: 'bg-red-100 text-red-700',
  dept_manager: 'bg-blue-100 text-blue-700',
  dept_sub_manager: 'bg-sky-100 text-sky-700',
  partner: 'bg-slate-100 text-slate-600',
}

// 한국어/영어 역할 매핑 (Excel 업로드 등에서 사용)
export const ROLE_MAP: Record<string, string> = {
  '최고관리자': 'super_admin',
  '사이트관리자': 'site_admin',
  '부서담당': 'dept_manager',
  '부서부담당': 'dept_sub_manager',
  '협력점': 'partner',
  super_admin: 'super_admin',
  site_admin: 'site_admin',
  dept_manager: 'dept_manager',
  dept_sub_manager: 'dept_sub_manager',
  partner: 'partner',
  // 레거시 호환
  admin: 'super_admin',
  handler: 'dept_manager',
  user: 'partner',
  '관리자': 'super_admin',
  '담당자': 'dept_manager',
  '일반': 'partner',
  '일반 사용자': 'partner',
}

/** 관리자급 (모든 권한) */
export function isAdminRole(role: string): boolean {
  return role === 'super_admin' || role === 'site_admin'
}

/** 부서 담당급 (부서 권한) */
export function isDeptRole(role: string): boolean {
  return role === 'dept_manager' || role === 'dept_sub_manager'
}

/** 업무 처리 가능 (관리자 + 부서담당급) */
export function isHandlerRole(role: string): boolean {
  return isAdminRole(role) || isDeptRole(role)
}

/** 업무 요청만 가능 */
export function isPartnerRole(role: string): boolean {
  return role === 'partner'
}
