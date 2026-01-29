-- CreateTable
CREATE TABLE "processed_records" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "record_index" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_records_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "processed_records" ADD CONSTRAINT "processed_records_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
