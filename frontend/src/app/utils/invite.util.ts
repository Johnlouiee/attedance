export function buildStudentJoinUrl(inviteToken: string): string {
  const token = inviteToken.trim();
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/student/join/${token}`;
  }
  return `/student/join/${token}`;
}
