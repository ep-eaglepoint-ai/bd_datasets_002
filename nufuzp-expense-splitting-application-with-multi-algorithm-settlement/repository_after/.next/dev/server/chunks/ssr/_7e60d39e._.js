module.exports = [
"[project]/server-actions/balances.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"00cd6481bca9375245226bae1ac4724c0174f95ddf":"getDashboardData","40e8550e22d57a16a0320dbf1421d40fb9eb00993f":"getBalances"},"",""] */ __turbopack_context__.s([
    "getBalances",
    ()=>getBalances,
    "getDashboardData",
    ()=>getDashboardData
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
async function getBalances(groupId) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) {
        throw new Error('Unauthorized');
    }
    // Verify user is a member
    const membership = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].groupMember.findUnique({
        where: {
            groupId_userId: {
                groupId,
                userId: session.user.id
            }
        }
    });
    if (!membership) {
        throw new Error('Not a member of this group');
    }
    const balances = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].balance.findMany({
        where: {
            groupId
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });
    return balances;
}
async function getDashboardData() {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) {
        throw new Error('Unauthorized');
    }
    const groups = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].group.findMany({
        where: {
            members: {
                some: {
                    userId: session.user.id
                }
            }
        },
        include: {
            members: {
                include: {
                    user: true
                }
            },
            balances: {
                where: {
                    userId: session.user.id
                }
            },
            _count: {
                select: {
                    expenses: true,
                    members: true
                }
            }
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });
    return groups;
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getBalances,
    getDashboardData
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getBalances, "40e8550e22d57a16a0320dbf1421d40fb9eb00993f", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getDashboardData, "00cd6481bca9375245226bae1ac4724c0174f95ddf", null);
}),
"[project]/.next-internal/server/app/(dashboard)/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/(dashboard)/layout.tsx [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/server-actions/balances.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$dashboard$292f$layout$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(dashboard)/layout.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$server$2d$actions$2f$balances$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/server-actions/balances.ts [app-rsc] (ecmascript)");
;
;
;
}),
"[project]/.next-internal/server/app/(dashboard)/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/(dashboard)/layout.tsx [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/server-actions/balances.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "00cd6481bca9375245226bae1ac4724c0174f95ddf",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$server$2d$actions$2f$balances$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDashboardData"],
    "00e3a296f05e82872215e044754eef8f60fcb5233f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$dashboard$292f$layout$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["$$RSC_SERVER_ACTION_0"],
    "40e8550e22d57a16a0320dbf1421d40fb9eb00993f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$server$2d$actions$2f$balances$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getBalances"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f28$dashboard$292f$dashboard$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f28$dashboard$292f$layout$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE1__$3d3e$__$225b$project$5d2f$server$2d$actions$2f$balances$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/(dashboard)/dashboard/page/actions.js { ACTIONS_MODULE0 => "[project]/app/(dashboard)/layout.tsx [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/server-actions/balances.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$dashboard$292f$layout$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(dashboard)/layout.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$server$2d$actions$2f$balances$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/server-actions/balances.ts [app-rsc] (ecmascript)");
}),
"[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// This function ensures that all the exported values are valid server actions,
// during the runtime. By definition all actions are required to be async
// functions, but here we can only check that they are functions.
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ensureServerEntryExports", {
    enumerable: true,
    get: function() {
        return ensureServerEntryExports;
    }
});
function ensureServerEntryExports(actions) {
    for(let i = 0; i < actions.length; i++){
        const action = actions[i];
        if (typeof action !== 'function') {
            throw Object.defineProperty(new Error(`A "use server" file can only export async functions, found ${typeof action}.\nRead more: https://nextjs.org/docs/messages/invalid-use-server-value`), "__NEXT_ERROR_CODE", {
                value: "E352",
                enumerable: false,
                configurable: true
            });
        }
    }
} //# sourceMappingURL=action-validate.js.map
}),
];

//# sourceMappingURL=_7e60d39e._.js.map