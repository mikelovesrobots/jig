export type ArgType = "string" | "number" | "boolean" | "file";

export interface ArgDef {
  name: string;
  type: ArgType;
  default?: string | number | boolean;
  description?: string;
}

export interface CommandDef {
  name: string;
  description: string;
  args: ArgDef[];
  promptBody: string;
}
