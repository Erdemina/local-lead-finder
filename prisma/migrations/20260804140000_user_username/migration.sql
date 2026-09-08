-- Kullanıcı adı ile giriş: e-posta korunur, username opsiyonel ve benzersizdir.

ALTER TABLE "User" ADD COLUMN     "username" TEXT;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
