-- CreateTable
CREATE TABLE "FBO" (
    "id" SERIAL NOT NULL,
    "fbo_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "op_country" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FBO_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FBO_fbo_number_key" ON "FBO"("fbo_number");
