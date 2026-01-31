-- CreateTable
CREATE TABLE "top_up_transactions" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "top_up_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "top_up_transactions_id_createdAt_idx" ON "top_up_transactions"("id", "createdAt");
