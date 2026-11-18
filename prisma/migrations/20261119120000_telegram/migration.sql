-- Уведомления в Telegram: привязка чата к пользователю
ALTER TABLE "User" ADD COLUMN "telegramChatId" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramName" TEXT;
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");
