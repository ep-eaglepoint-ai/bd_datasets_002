-- CreateTable (no schema changes from original - uses existing table structure)
CREATE TABLE IF NOT EXISTS "TopUpTransaction" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopUpTransaction_pkey" PRIMARY KEY ("id")
);

-- Note: No additional indexes added - cursor pagination works with existing primary key index
