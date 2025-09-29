-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "maxStock" INTEGER DEFAULT 0,
ADD COLUMN     "trackStock" BOOLEAN NOT NULL DEFAULT true;
