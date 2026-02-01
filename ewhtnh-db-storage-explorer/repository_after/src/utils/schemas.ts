import { z } from 'zod'

export const LinePointerSchema = z.object({
  offset: z.number(),
  length: z.number(),
  flags: z.number().optional(),
})

export const TupleLikeSchema = z.object({
  id: z.string().optional(),
  header: z.record(z.any()).optional(),
  linePointers: z.array(LinePointerSchema).optional(),
  data: z.any().optional(),
})

export const HeapPageSchema = z.object({
  header: z
    .object({
      pageType: z.string(),
      pageNumber: z.number(),
    })
    .catchall(z.any()),
  linePointers: z.array(LinePointerSchema).optional(),
  tuples: z.array(TupleLikeSchema).optional(),
  freeSpace: z
    .object({
      offset: z.number(),
      length: z.number(),
    })
    .optional(),
  fillFactor: z.number().optional(),
  deadTupleRatio: z.number().optional(),
})

export const SnapshotSchemaZod = z
  .object({
    databaseName: z.string().optional(),
    tableName: z.string().optional(),
    heapPages: z.array(HeapPageSchema).optional(),
    indexPages: z.array(z.any()).optional(),
    totalPages: z.number().optional(),
  })
  .strict()

export type SnapshotSchemaType = z.infer<typeof SnapshotSchemaZod>

export const SnapshotSchema = {
  parse(data: unknown): SnapshotSchemaType {
    return SnapshotSchemaZod.parse(data)
  },
}
