export class HttpProblem extends Error {
  readonly status: number;
  readonly code: string;
  readonly type: string;

  constructor(status: number, code: string, detail: string, type = "about:blank") {
    super(detail);
    this.name = "HttpProblem";
    this.status = status;
    this.code = code;
    this.type = type;
  }
}

export function problemDocument(
  status: number,
  title: string,
  detail: string,
  code?: string,
  instance?: string,
) {
  return {
    type: "about:blank",
    title,
    status,
    detail,
    ...(code ? { code } : {}),
    ...(instance ? { instance } : {}),
  };
}
