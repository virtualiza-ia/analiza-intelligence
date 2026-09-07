export type AreaScopeLike = {
  branchId?: string | null;
  branchName?: string | null;
  operationalAreaId?: string | null;
  operationalAreaName?: string | null;
};

export type AreaBranchLike = {
  areaManagerName?: string;
  branch?: string;
  city?: string;
  code?: string;
  id?: string;
  name?: string;
  operationalAreaId?: string;
};

export type AreaManagerRecordLike = {
  areaManager?: string;
  branch?: string;
  branchCode?: string;
  city?: string;
  id?: string;
};

export function normalizeScopeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isAllScopeLabel(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const normalizedValue = normalizeScopeText(value);

  return (
    normalizedValue === "all" ||
    normalizedValue === "todos" ||
    normalizedValue === "todas" ||
    normalizedValue === "__all__" ||
    normalizedValue.startsWith("todos los ") ||
    normalizedValue.startsWith("todas las ") ||
    normalizedValue.startsWith("todas mis ")
  );
}

export function scopeTextsMatch(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  if (!left || !right || isAllScopeLabel(left) || isAllScopeLabel(right)) {
    return false;
  }

  const normalizedLeft = normalizeScopeText(left);
  const normalizedRight = normalizeScopeText(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function specificScopeValue(value: string | null | undefined) {
  return value && !isAllScopeLabel(value) ? value : null;
}

function areaScopeNames(
  actorScope: AreaScopeLike | undefined,
  context: AreaScopeLike | null,
) {
  return [
    specificScopeValue(actorScope?.operationalAreaName),
    specificScopeValue(context?.operationalAreaName),
  ].filter((value): value is string => Boolean(value));
}

function branchScopeNames(
  actorScope: AreaScopeLike | undefined,
  context: AreaScopeLike | null,
) {
  return [
    specificScopeValue(actorScope?.branchName),
    specificScopeValue(context?.branchName),
  ].filter((value): value is string => Boolean(value));
}

export function branchMatchesAreaScope(
  branch: AreaBranchLike,
  actorScope: AreaScopeLike | undefined,
  context: AreaScopeLike | null,
) {
  const scopedBranchId = specificScopeValue(actorScope?.branchId) ??
    specificScopeValue(context?.branchId);

  if (scopedBranchId && branch.id === scopedBranchId) {
    return true;
  }

  const branchNames = branchScopeNames(actorScope, context);

  if (
    branchNames.length > 0 &&
    branchNames.some((branchName) =>
      [branch.name, branch.branch, branch.city, branch.code].some((value) =>
        scopeTextsMatch(value, branchName),
      ),
    )
  ) {
    return true;
  }

  const scopedAreaId = specificScopeValue(actorScope?.operationalAreaId) ??
    specificScopeValue(context?.operationalAreaId);

  if (scopedAreaId && branch.operationalAreaId === scopedAreaId) {
    return true;
  }

  const areaNames = areaScopeNames(actorScope, context);

  if (areaNames.length === 0) {
    return false;
  }

  return areaNames.some((areaName) =>
    scopeTextsMatch(branch.areaManagerName, areaName),
  );
}

export function managerRecordMatchesAreaScope(
  record: AreaManagerRecordLike,
  actorScope: AreaScopeLike | undefined,
  context: AreaScopeLike | null,
) {
  const scopedBranchId = specificScopeValue(actorScope?.branchId) ??
    specificScopeValue(context?.branchId);

  if (scopedBranchId && record.id === scopedBranchId) {
    return true;
  }

  const branchNames = branchScopeNames(actorScope, context);

  if (
    branchNames.length > 0 &&
    branchNames.some((branchName) =>
      [record.branch, record.city, record.branchCode].some((value) =>
        scopeTextsMatch(value, branchName),
      ),
    )
  ) {
    return true;
  }

  const areaNames = areaScopeNames(actorScope, context);

  if (areaNames.length === 0) {
    return false;
  }

  return areaNames.some((areaName) =>
    scopeTextsMatch(record.areaManager, areaName),
  );
}
