-- CreateTable
CREATE TABLE "Character" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "x" REAL NOT NULL DEFAULT 300,
    "y" REAL NOT NULL DEFAULT 300,
    "color" TEXT NOT NULL DEFAULT '#ffffff',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Character_name_key" ON "Character"("name");
