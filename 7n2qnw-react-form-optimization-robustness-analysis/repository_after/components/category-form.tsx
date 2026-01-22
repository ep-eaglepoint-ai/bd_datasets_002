"use client";

import * as z from "zod";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash } from "lucide-react";
import { Billboard, Category } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";
import React from 'react';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import AlertModal from "@/components/modals/alert-modal";
import { Heading } from "@/components/ui/heading";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
    name: z.string().min(2),
    billboardId: z.string().min(1),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
    initialData: Category | null;
    billboards: Billboard[];
}

export const CategoryForm: React.FC<CategoryFormProps> = React.memo(({
    initialData,
    billboards,
}) => {
    const params = useParams();
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Lifecycle controls
    const isSubmitting = useRef(false);
    const isMounted = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            abortControllerRef.current?.abort();
        };
    }, []);

    const uiText = useMemo(() => {
        return initialData
            ? {
                title: "Edit category",
                description: "Edit a category.",
                action: "Save changes",
                success: "Category updated.",
            }
            : {
                title: "Create category",
                description: "Add a new category",
                action: "Create",
                success: "Category created.",
            };
    }, [initialData]);

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData || {
            name: "",
            billboardId: "",
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                billboardId: initialData.billboardId,
            });
        }
    }, [initialData, form]);

    const onSubmit = useCallback(
        async (data: CategoryFormValues) => {
            if (isSubmitting.current) return;

            const requestId = ++requestIdRef.current;
            isSubmitting.current = true;
            setLoading(true);

            abortControllerRef.current?.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;

            try {
                const res = await fetch(
                    initialData
                        ? `/api/${params.storeId}/categories/${params.categoryId}`
                        : `/api/${params.storeId}/categories`,
                    {
                        method: initialData ? "PATCH" : "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ...data,
                            _idempotencyKey: requestId, // client-side idempotency hint
                        }),
                        signal: controller.signal,
                    }
                );

                if (!res.ok) throw new Error("Request failed");

                if (!isMounted.current || requestId !== requestIdRef.current) return;

                toast.success(uiText.success);
                router.push(`/${params.storeId}/categories`);
            } catch (err: any) {
                if (err.name !== "AbortError") {
                    toast.error("Something went wrong.");
                }
            } finally {
                if (isMounted.current && requestId === requestIdRef.current) {
                    isSubmitting.current = false;
                    setLoading(false);
                }
            }
        },
        [initialData, params.storeId, params.categoryId, router, uiText.success]
    );

    const onDelete = useCallback(async () => {
        if (isSubmitting.current) return;

        const requestId = ++requestIdRef.current;
        isSubmitting.current = true;
        setLoading(true);

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const res = await fetch(
                `/api/${params.storeId}/categories/${params.categoryId}`,
                { method: "DELETE", signal: controller.signal }
            );

            if (!res.ok) throw new Error("Delete failed");

            if (!isMounted.current || requestId !== requestIdRef.current) return;

            toast.success("Category deleted.");
            router.push(`/${params.storeId}/categories`);
        } catch (err: any) {
            if (err.name !== "AbortError") {
                toast.error(
                    "Make sure you removed all products using this category first."
                );
            }
        } finally {
            if (isMounted.current && requestId === requestIdRef.current) {
                isSubmitting.current = false;
                setLoading(false);
                setOpen(false);
            }
        }
    }, [params.storeId, params.categoryId, router]);

    const billboardOptions = useMemo(
        () =>
            billboards.map((billboard) => (
                <SelectItem key={billboard.id} value={billboard.id}>
                    {billboard.label}
                </SelectItem>
            )),
        [billboards]
    );

    return (
        <>
            <AlertModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={onDelete}
                loading={loading}
            />
            <div className="flex items-center justify-between">
                <Heading title={uiText.title} description={uiText.description} />
                {initialData && (
                    <Button
                        disabled={loading}
                        variant="destructive"
                        size="sm"
                        onClick={() => setOpen(true)}
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <Separator />
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-8 w-full"
                >
                    <div className="md:grid md:grid-cols-3 gap-8">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            disabled={loading}
                                            placeholder="Category name"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="billboardId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Billboard</FormLabel>
                                    <Select
                                        disabled={loading}
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue
                                                    defaultValue={field.value}
                                                    placeholder="Select a billboard"
                                                />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {billboardOptions}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <Button disabled={loading} className="ml-auto" type="submit">
                        {uiText.action}
                    </Button>
                </form>
            </Form>
        </>
    );
});
