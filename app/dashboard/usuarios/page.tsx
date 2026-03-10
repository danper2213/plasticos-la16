import { listUsersWithRoles } from "./actions";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage() {
  const result = await listUsersWithRoles();

  return (
    <div className="space-y-6">
      <UsuariosClient
        initialUsers={result.users}
        initialError={result.error}
        currentUserId={result.currentUserId}
      />
    </div>
  );
}
