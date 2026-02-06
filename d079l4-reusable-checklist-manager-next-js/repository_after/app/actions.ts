"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import {
  TemplateSchema,
  CreateInstanceSchema,
  UpdateInstanceItemSchema,
  UpdateInstanceStatusSchema,
} from "@/lib/schemas";
import { redirect } from "next/navigation";

// --- TEMPLATES ---

export async function createTemplate(data: unknown) {
  const result = TemplateSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.format() };
  }

  const { title, description, items } = result.data;

  try {
    const template = await prisma.template.create({
      data: {
        title,
        description,
        items: {
          create: items.map((item, index) => ({
            text: item.text,
            description: item.description,
            required: item.required,
            order: index, // Ensure order is preserved
          })),
        },
      },
    });
    revalidatePath("/templates");
    return { success: true, data: template };
  } catch (error) {
    console.error("Failed to create template:", error);
    return { error: "Failed to create template" };
  }
}

export async function deleteTemplate(id: string) {
  try {
    await prisma.template.delete({ where: { id } });
    revalidatePath("/templates");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete template" };
  }
}

export async function getTemplates() {
  try {
    return await prisma.template.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { instances: true } } },
    });
  } catch (error) {
    return [];
  }
}

export async function getTemplate(id: string) {
  try {
    return await prisma.template.findUnique({
      where: { id },
      include: { items: { orderBy: { order: "asc" } } },
    });
  } catch (error) {
    return null;
  }
}

export async function updateTemplate(id: string, data: unknown) {
  const result = TemplateSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.format() };
  }

  const { title, description, items } = result.data;

  try {
    // Transaction to update template and replace items
    await prisma.$transaction(async (tx) => {
      await tx.template.update({
        where: { id },
        data: { title, description },
      });

      // Delete existing items and recreate them to handle reordering/edits easily
      // In a more complex app, we might reconcile ID updates.
      await tx.templateItem.deleteMany({ where: { templateId: id } });

      await tx.templateItem.createMany({
        data: items.map((item, index) => ({
          templateId: id,
          text: item.text,
          description: item.description,
          required: item.required,
          order: index,
        })),
      });
    });

    revalidatePath("/templates");
    revalidatePath(`/templates/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update template:", error);
    return { error: "Failed to update template" };
  }
}

// --- INSTANCES ---

export async function createInstance(data: unknown) {
  const result = CreateInstanceSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.format() };
  }

  const { templateId, title, notes } = result.data;

  try {
    // 1. Fetch template items
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: { items: true },
    });

    if (!template) return { error: "Template not found" };

    // 2. Create instance with copied items
    const instance = await prisma.checklistInstance.create({
      data: {
        title: title || `${template.title} Instance`,
        notes,
        templateId,
        status: "ACTIVE",
        items: {
          create: template.items.map((item) => ({
            text: item.text,
            description: item.description,
            required: item.required,
            order: item.order,
            completed: false,
          })),
        },
      },
    });

    revalidatePath("/instances");
    return { success: true, data: instance };
  } catch (error) {
    console.error("Failed to create instance:", error);
    return { error: "Failed to create instance" };
  }
}

export async function toggleInstanceItem(itemId: string, completed: boolean) {
  try {
    const item = await prisma.instanceItem.update({
      where: { id: itemId },
      data: { completed },
    });
    revalidatePath(`/instances/${item.instanceId}`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to update item" };
  }
}

export async function updateInstanceStatus(
  id: string,
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED",
) {
  try {
    await prisma.checklistInstance.update({
      where: { id },
      data: { status },
    });
    revalidatePath("/instances");
    revalidatePath(`/instances/${id}`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to update status" };
  }
}

export async function deleteInstance(id: string) {
  try {
    await prisma.checklistInstance.delete({ where: { id } });
    revalidatePath("/instances");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete instance" };
  }
}

export async function getInstances() {
  try {
    return await prisma.checklistInstance.findMany({
      orderBy: { updatedAt: "desc" },
      include: { template: true, items: true },
    });
  } catch (error) {
    return [];
  }
}

export async function getInstance(id: string) {
  try {
    return await prisma.checklistInstance.findUnique({
      where: { id },
      include: {
        template: true,
        items: { orderBy: { order: "asc" } },
      },
    });
  } catch (error) {
    return null;
  }
}
