/*
  Warnings:

  - You are about to drop the column `description` on the `Item` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[item_code]` on the table `Item` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `health` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `item_code` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `power` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Item` DROP COLUMN `description`,
    ADD COLUMN `health` INTEGER NOT NULL,
    ADD COLUMN `item_code` INTEGER NOT NULL,
    ADD COLUMN `power` INTEGER NOT NULL,
    ADD COLUMN `price` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Item_item_code_key` ON `Item`(`item_code`);
