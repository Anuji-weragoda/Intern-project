export function redirect(href: string) {
  // Isolated for testability; real implementation touches window
  window.location.href = href;
}

export default { redirect };
