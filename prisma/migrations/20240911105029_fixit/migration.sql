/*
  Warnings:

  - Made the column `inventoryId` on table `Character` required. This step will fail if there are existing NULL values in that column.
  - Made the column `equippedId` on table `Character` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Character` DROP FOREIGN KEY `Character_equippedId_fkey`;

-- DropForeignKey
ALTER TABLE `Character` DROP FOREIGN KEY `Character_inventoryId_fkey`;

-- AlterTable
ALTER TABLE `Character` MODIFY `inventoryId` INTEGER NOT NULL,
    MODIFY `equippedId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Character` ADD CONSTRAINT `Character_equippedId_fkey` FOREIGN KEY (`equippedId`) REFERENCES `Equipped`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Character` ADD CONSTRAINT `Character_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `Inventory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
