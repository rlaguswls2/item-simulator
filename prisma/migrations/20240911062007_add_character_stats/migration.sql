/*
  Warnings:

  - Added the required column `health` to the `Character` table without a default value. This is not possible if the table is not empty.
  - Added the required column `money` to the `Character` table without a default value. This is not possible if the table is not empty.
  - Added the required column `power` to the `Character` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Character` ADD COLUMN `health` INTEGER NOT NULL,
    ADD COLUMN `money` INTEGER NOT NULL,
    ADD COLUMN `power` INTEGER NOT NULL;
