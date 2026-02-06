/**
 * Minimal Zod-like validation library used for this kata.
 * It implements only the subset of Zod that we need:
 * - z.string()
 * - z.boolean()
 * - z.enum()
 * - z.object()
 * - ZodType.parse()
 * - ZodType.safeParse()
 */

export type SafeParseSuccess<T> = {
  success: true;
  data: T;
};

export type SafeParseFailure = {
  success: false;
  error: Error;
};

export type SafeParseReturn<T> = SafeParseSuccess<T> | SafeParseFailure;

class ZodType<T> {
  private readonly validator: (value: unknown) => T;

  constructor(validator: (value: unknown) => T) {
    this.validator = validator;
  }

  parse(value: unknown): T {
    return this.validator(value);
  }

  safeParse(value: unknown): SafeParseReturn<T> {
    try {
      const data = this.parse(value);
      return { success: true, data };
    } catch (error: any) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error(typeof error === "string" ? error : "Validation error"),
      };
    }
  }
}

const string = () =>
  new ZodType<string>((value) => {
    if (typeof value !== "string") {
      throw new Error(`Expected string, received ${typeof value}`);
    }
    return value;
  });

const boolean = () =>
  new ZodType<boolean>((value) => {
    if (typeof value !== "boolean") {
      throw new Error(`Expected boolean, received ${typeof value}`);
    }
    return value;
  });

const enum_ = <T extends readonly [string, ...string[]]>(values: T) =>
  new ZodType<T[number]>((value) => {
    if (typeof value !== "string" || !values.includes(value)) {
      throw new Error(
        `Expected one of ${values.join(", ")}, received ${String(value)}`,
      );
    }
    return value as T[number];
  });

type Shape = Record<string, ZodType<any>>;

const object = <TShape extends Shape>(shape: TShape) =>
  new ZodType<{ [K in keyof TShape]: TShape[K] extends ZodType<infer U> ? U : never }>(
    (value) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error("Expected object");
      }
      const result: any = {};
      for (const key of Object.keys(shape)) {
        const schema = shape[key];
        const raw = (value as any)[key];
        result[key] = schema.parse(raw);
      }
      return result;
    },
  );

export const z = {
  string,
  boolean,
  enum: enum_,
  object,
  ZodType,
};

export type ZodTypeAny = ZodType<any>;

