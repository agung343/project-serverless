interface NeonDatabaseError {
  code: string;
  constraint?: string;
  detail?: string;
}

export function isDbError(error: unknown): error is NeonDatabaseError {
  return typeof error === "object" && error !== null && "code" in error;
}
