import { usersRepo } from '../../database/users.repo.js';
import { isAdmin } from '../../config/index.js';

export async function authMiddleware(ctx, next) {
  if (ctx.from) {
    const isUserAdmin = isAdmin(ctx.from.id);
    
    // Foydalanuvchini bazada yangilash/saqlash
    usersRepo.upsertUser({
      telegram_id: ctx.from.id,
      username: ctx.from.username,
      first_name: ctx.from.first_name,
      is_admin: isUserAdmin ? 1 : 0
    });

    ctx.isAdmin = isUserAdmin;
  } else {
    ctx.isAdmin = false;
  }

  await next();
}
