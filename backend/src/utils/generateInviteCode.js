function generateInviteCode(groupName = "panic") {
  const base = groupName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 10) || "BARKADA";

  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${base}-${suffix}`;
}

module.exports = generateInviteCode;
