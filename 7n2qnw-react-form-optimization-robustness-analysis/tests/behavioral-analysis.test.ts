import * as path from "path";

type HookHarness = ReturnType<typeof createHookHarness>;

const targetRepo = process.env.REPO_PATH || "repository_after";
const componentModulePath = path.join(
  __dirname,
  "..",
  targetRepo,
  "components",
  "category-form",
);

const createElement = (type: any, props: any, ...children: any[]) => ({
  type,
  props: { ...props, children },
});

function createHookHarness() {
  let hookIndex = 0;
  const stateValues: any[] = [];
  const refValues: any[] = [];
  const memoValues: any[] = [];
  const memoDeps: any[] = [];
  const callbackValues: any[] = [];
  const callbackDeps: any[] = [];
  const effectDeps: any[] = [];
  const effectCleanups: Array<(() => void) | undefined> = [];

  const depsChanged = (prev: any[] | undefined, next: any[] | undefined) => {
    if (!prev || !next) return true;
    if (prev.length !== next.length) return true;
    return prev.some((value, index) => value !== next[index]);
  };

  const resetIndex = () => {
    hookIndex = 0;
  };

  const useState = (initial: any) => {
    const index = hookIndex++;
    if (stateValues[index] === undefined) {
      stateValues[index] = typeof initial === "function" ? initial() : initial;
    }
    const setState = (next: any) => {
      stateValues[index] =
        typeof next === "function" ? next(stateValues[index]) : next;
    };
    return [stateValues[index], setState] as const;
  };

  const useRef = (initial: any) => {
    const index = hookIndex++;
    if (!refValues[index]) {
      refValues[index] = { current: initial };
    }
    return refValues[index];
  };

  const useMemo = (factory: () => any, deps?: any[]) => {
    const index = hookIndex++;
    if (!memoDeps[index] || depsChanged(memoDeps[index], deps)) {
      memoDeps[index] = deps;
      memoValues[index] = factory();
    }
    return memoValues[index];
  };

  const useCallback = (callback: (...args: any[]) => any, deps?: any[]) => {
    const index = hookIndex++;
    if (!callbackDeps[index] || depsChanged(callbackDeps[index], deps)) {
      callbackDeps[index] = deps;
      callbackValues[index] = callback;
    }
    return callbackValues[index];
  };

  const useEffect = (effect: () => void | (() => void), deps?: any[]) => {
    const index = hookIndex++;
    if (!effectDeps[index] || depsChanged(effectDeps[index], deps)) {
      effectDeps[index] = deps;
      const cleanup = effect();
      effectCleanups[index] =
        typeof cleanup === "function" ? cleanup : undefined;
    }
  };

  const cleanupEffects = () => {
    effectCleanups.forEach((cleanup) => cleanup?.());
  };

  return {
    useState,
    useRef,
    useMemo,
    useCallback,
    useEffect,
    resetIndex,
    cleanupEffects,
    stateValues,
    refValues,
    memoValues,
    callbackValues,
  };
}

function setupModule(hooks: HookHarness) {
  const toast = { success: jest.fn(), error: jest.fn() };
  const router = { push: jest.fn() };
  const params = { storeId: "store-123", categoryId: "cat-456" };
  const formReset = jest.fn();
  const useForm = jest.fn(() => ({
    control: {},
    handleSubmit: (cb: any) => cb,
    reset: formReset,
  }));

  const abortInstances: Array<{ abort: jest.Mock; signal: any }> = [];
  class MockAbortController {
    signal = { aborted: false };
    abort = jest.fn(() => {
      this.signal.aborted = true;
    });
    constructor() {
      abortInstances.push(this);
    }
  }

  jest.doMock(
    "react",
    () => ({
      __esModule: true,
      default: { memo: (component: any) => component, createElement },
      memo: (component: any) => component,
      createElement,
      useState: hooks.useState,
      useRef: hooks.useRef,
      useEffect: hooks.useEffect,
      useMemo: hooks.useMemo,
      useCallback: hooks.useCallback,
    }),
    { virtual: true },
  );

  jest.doMock("react-hot-toast", () => ({ toast }), { virtual: true });
  jest.doMock(
    "next/navigation",
    () => ({
      useParams: () => params,
      useRouter: () => router,
    }),
    { virtual: true },
  );
  jest.doMock("@prisma/client", () => ({}), { virtual: true });
  jest.doMock("react-hook-form", () => ({ useForm }), { virtual: true });
  jest.doMock("lucide-react", () => ({ Trash: () => null }), { virtual: true });

  jest.doMock("@/components/ui/input", () => ({ Input: () => null }), {
    virtual: true,
  });
  jest.doMock("@/components/ui/button", () => ({ Button: () => null }), {
    virtual: true,
  });
  jest.doMock(
    "@/components/ui/form",
    () => ({
      Form: ({ children }: { children: any }) => children ?? null,
      FormControl: ({ children }: { children: any }) => children ?? null,
      FormField: ({ render }: { render: any }) => render({ field: {} }),
      FormItem: ({ children }: { children: any }) => children ?? null,
      FormLabel: ({ children }: { children: any }) => children ?? null,
      FormMessage: () => null,
    }),
    { virtual: true },
  );
  jest.doMock("@/components/ui/separator", () => ({ Separator: () => null }), {
    virtual: true,
  });
  jest.doMock("@/components/ui/heading", () => ({ Heading: () => null }), {
    virtual: true,
  });
  jest.doMock(
    "@/components/modals/alert-modal",
    () => ({
      default: () => null,
    }),
    { virtual: true },
  );
  jest.doMock(
    "@/components/ui/select",
    () => ({
      Select: ({ children }: { children: any }) => children ?? null,
      SelectContent: ({ children }: { children: any }) => children ?? null,
      SelectItem: () => null,
      SelectTrigger: ({ children }: { children: any }) => children ?? null,
      SelectValue: () => null,
    }),
    { virtual: true },
  );

  return {
    toast,
    router,
    params,
    useForm,
    formReset,
    abortInstances,
    MockAbortController,
  };
}

function loadComponent() {
  let component: any;
  jest.isolateModules(() => {
    component = require(componentModulePath).CategoryForm;
  });
  return component;
}

function renderComponent(
  Component: any,
  hooks: HookHarness,
  props: { initialData: any; billboards: any[] },
) {
  hooks.resetIndex();
  Component(props);
}

describe("CategoryForm Behavioral Analysis (runtime)", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("prevents double submission and uses idempotency headers", async () => {
    const hooks = createHookHarness();
    const { toast, router, abortInstances, MockAbortController } =
      setupModule(hooks);

    (global as any).AbortController = MockAbortController;

    let resolveFetch: (value: any) => void = () => undefined;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = jest.fn().mockReturnValue(fetchPromise);
    (global as any).fetch = fetchMock;

    const Component = loadComponent();
    renderComponent(Component, hooks, { initialData: null, billboards: [] });

    const onSubmit = hooks.callbackValues[0];

    const submitPromise = onSubmit({ name: "A", billboardId: "B" });
    await Promise.resolve();

    await onSubmit({ name: "A", billboardId: "B" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchOptions = fetchMock.mock.calls[0][1];
    expect(fetchOptions.headers["Idempotency-Key"]).toBeTruthy();

    resolveFetch({ ok: true });
    await submitPromise;

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/store-123/categories");
    expect(abortInstances.length).toBe(1);
  });

  test("aborts previous request when starting a new one", async () => {
    const hooks = createHookHarness();
    const { MockAbortController, abortInstances } = setupModule(hooks);
    (global as any).AbortController = MockAbortController;

    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    (global as any).fetch = fetchMock;

    const Component = loadComponent();
    renderComponent(Component, hooks, { initialData: null, billboards: [] });
    const onSubmit = hooks.callbackValues[0];

    await onSubmit({ name: "A", billboardId: "B" });
    expect(abortInstances).toHaveLength(1);

    await onSubmit({ name: "A", billboardId: "B" });
    expect(abortInstances).toHaveLength(2);
    expect(abortInstances[0].abort).toHaveBeenCalled();
  });

  test("avoids stale updates when unmounted", async () => {
    const hooks = createHookHarness();
    const { toast, router, MockAbortController } = setupModule(hooks);
    (global as any).AbortController = MockAbortController;

    let resolveFetch: (value: any) => void = () => undefined;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    (global as any).fetch = jest.fn().mockReturnValue(fetchPromise);

    const Component = loadComponent();
    renderComponent(Component, hooks, { initialData: null, billboards: [] });
    const onSubmit = hooks.callbackValues[0];

    const submitPromise = onSubmit({ name: "A", billboardId: "B" });
    hooks.refValues[3].current = false; // isMounted

    resolveFetch({ ok: true });
    await submitPromise;

    expect(toast.success).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  test("reports errors and releases loading on failure", async () => {
    const hooks = createHookHarness();
    const { toast, MockAbortController } = setupModule(hooks);
    (global as any).AbortController = MockAbortController;

    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false });

    const Component = loadComponent();
    renderComponent(Component, hooks, { initialData: null, billboards: [] });
    const onSubmit = hooks.callbackValues[0];

    await onSubmit({ name: "A", billboardId: "B" });

    expect(toast.error).toHaveBeenCalled();
    expect(hooks.stateValues[1]).toBe(false);
  });

  test("memoizes list rendering to avoid repeated mapping", () => {
    const hooks = createHookHarness();
    setupModule(hooks);

    const mapSpy = jest.fn((fn: any) =>
      ["one", "two"].map((label, index) => fn({ id: String(index), label })),
    );
    const billboards: any[] = Object.assign([], [], { map: mapSpy });

    const Component = loadComponent();

    renderComponent(Component, hooks, { initialData: null, billboards });
    expect(mapSpy).toHaveBeenCalledTimes(1);

    renderComponent(Component, hooks, { initialData: null, billboards });
    expect(mapSpy).toHaveBeenCalledTimes(1);

    const nextBillboards: any[] = Object.assign([], [], { map: mapSpy });
    renderComponent(Component, hooks, {
      initialData: null,
      billboards: nextBillboards,
    });
    expect(mapSpy).toHaveBeenCalledTimes(2);
  });

  test("stabilizes handlers across renders with same deps", () => {
    const hooks = createHookHarness();
    setupModule(hooks);

    const Component = loadComponent();
    renderComponent(Component, hooks, { initialData: null, billboards: [] });
    const firstSubmit = hooks.callbackValues[0];
    const firstDelete = hooks.callbackValues[1];

    renderComponent(Component, hooks, { initialData: null, billboards: [] });
    const secondSubmit = hooks.callbackValues[0];
    const secondDelete = hooks.callbackValues[1];

    expect(secondSubmit).toBe(firstSubmit);
    expect(secondDelete).toBe(firstDelete);
  });

  test("delete flow sends idempotency header and navigates", async () => {
    const hooks = createHookHarness();
    const { toast, router, MockAbortController } = setupModule(hooks);
    (global as any).AbortController = MockAbortController;

    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    (global as any).fetch = fetchMock;

    const Component = loadComponent();
    renderComponent(Component, hooks, {
      initialData: { id: "1", name: "A", billboardId: "B" },
      billboards: [],
    });
    const onDelete = hooks.callbackValues[1];

    await onDelete();

    const options = fetchMock.mock.calls[0][1];
    expect(options.method).toBe("DELETE");
    expect(options.headers["Idempotency-Key"]).toBeTruthy();
    expect(toast.success).toHaveBeenCalledWith("Category deleted.");
    expect(router.push).toHaveBeenCalledWith("/store-123/categories");
  });
});
