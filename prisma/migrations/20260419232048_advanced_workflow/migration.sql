/*
  Warnings:

  - The values [FINALIZADA] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('ASIGNADA', 'EN_PROCESO', 'ESPERANDO_REPUESTOS', 'REPUESTOS_RECIBIDOS', 'TERMINADA', 'TERMINADA_CON_NOVEDAD');
ALTER TABLE "public"."work_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "work_orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "work_orders" ALTER COLUMN "status" SET DEFAULT 'ASIGNADA';
COMMIT;

-- AlterTable
ALTER TABLE "fault_reports" ADD COLUMN     "system_affected" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "name" TEXT,
ADD COLUMN     "specialty" TEXT;

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "concepts" TEXT,
ADD COLUMN     "conclusion" TEXT;

-- CreateTable
CREATE TABLE "work_order_logs" (
    "id" TEXT NOT NULL,
    "old_status" TEXT,
    "new_status" TEXT NOT NULL,
    "notes" TEXT,
    "work_order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "work_order_logs" ADD CONSTRAINT "work_order_logs_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_logs" ADD CONSTRAINT "work_order_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
