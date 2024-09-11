-- DropForeignKey
ALTER TABLE `Character` DROP FOREIGN KEY `Character_equippedId_fkey`;

-- DropForeignKey
ALTER TABLE `Character` DROP FOREIGN KEY `Character_inventoryId_fkey`;

-- AlterTable
ALTER TABLE `Character` MODIFY `inventoryId` INTEGER NULL,
    MODIFY `equippedId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Character` ADD CONSTRAINT `Character_equippedId_fkey` FOREIGN KEY (`equippedId`) REFERENCES `Equipped`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Character` ADD CONSTRAINT `Character_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `Inventory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
