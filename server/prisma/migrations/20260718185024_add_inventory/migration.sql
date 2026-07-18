-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Character" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "x" REAL NOT NULL DEFAULT 300,
    "y" REAL NOT NULL DEFAULT 300,
    "color" TEXT NOT NULL DEFAULT '#ffffff',
    "inventory" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Character" ("color", "id", "name", "updatedAt", "x", "y") SELECT "color", "id", "name", "updatedAt", "x", "y" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE UNIQUE INDEX "Character_name_key" ON "Character"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
