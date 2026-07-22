-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorldData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "placed" TEXT NOT NULL DEFAULT '[]',
    "chests" TEXT NOT NULL DEFAULT '{}'
);
INSERT INTO "new_WorldData" ("id", "placed") SELECT "id", "placed" FROM "WorldData";
DROP TABLE "WorldData";
ALTER TABLE "new_WorldData" RENAME TO "WorldData";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
